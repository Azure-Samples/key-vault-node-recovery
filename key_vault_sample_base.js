// --------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for
// license information.
// --------------------------------------------------------------------------

'use strict;'
const dotenv = require("dotenv");
dotenv.config();
const util = require('util');
const msRestAzure = require('ms-rest-azure');
const ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
const KeyVaultManagementClient = require('azure-arm-keyvault');
const { DefaultAzureCredential } = require('@azure/identity');
const { KeyClient } = require('@azure/keyvault-keys');
const { SecretClient } = require('@azure/keyvault-secrets');
const { CertificateClient } = require('@azure/keyvault-certificates');


const AuthenticationContext = require('adal-node').AuthenticationContext;

// Validate env variables
var envs = [];
if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
if (!process.env['AZURE_TENANT_ID']) envs.push('AZURE_TENANT_ID');
if (!process.env['AZURE_CLIENT_ID']) envs.push('AZURE_CLIENT_ID');
if (!process.env['AZURE_CLIENT_OID']) envs.push('AZURE_CLIENT_OID');
if (!process.env['AZURE_CLIENT_SECRET']) envs.push('AZURE_CLIENT_SECRET');

if (envs.length > 0) {
    throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

class ServicePrincipalAuthenticator {
    constructor(tenantId, clientId, clientSecret) {
        this._authContext = null;
        this._tenantId = tenantId;
        this._clientId = clientId;
        this._clientSecret = clientSecret;
    }

    /**
     * Callback passed to KeyVault client that performs authentication.
     * @param {object}   config         A config object like the one in the file key_vault_sample_config.json
     * @param {object}   challenge      Authentication parameters provided by Key Vault.
     * @param {function} callback       Callback function on completion.
     */
}

class KeyVaultSampleBase {
    constructor() {
        this._config = this._loadConfig();
        this._servicePrincipalAuthenticator = new ServicePrincipalAuthenticator(this._config.tenantId, this._config.clientId, this._config.secret);
    }
    
    _loadConfig() {
        const config = {
            // Service principal details for running the sample.
            subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'],
            tenantId:       process.env['AZURE_TENANT_ID'],
            clientId:       process.env['AZURE_CLIENT_ID'],
            objectId:       process.env['AZURE_CLIENT_OID'],
            secret:         process.env['AZURE_CLIENT_SECRET'],
            azureLocation:  process.env['AZURE_LOCATION'] || 'westus',
            groupName:      process.env['AZURE_RESOURCE_GROUP'] || 'azure-sample-group',
        };
        
        return config;
    }

    _getRandNamePart(list) {
        var element = rand(list.length - 1, 0);
        return list[element];
    }

    /**
     * Creates a random name for a KeyVault vault, key, secret, etc.
     * @param {string} base     A string used as the first part of the name.
     */
    _getName(base) {
        var name = '{base}-{adj}-{noun}';
        name = name.replace('{base}', base);
        name = name.replace('{adj}', this._getRandNamePart(adjectives));
        name = name.replace('{noun}', this._getRandNamePart(nouns));

        // Add random number as suffix
        if (name.length < 22) {
            name += '-';
            for (var i = 0; i < Math.min(5, 23 - name.length); i++) {
                name += rand(0, 10);
            }
        }

        return name;
    }

    /**
     * Storage account names cannot contain '-' so strip that out.
     */
    _getStorageAccountName() {
        var name = this._getName('storacct');
        return name.replace(/-/g, '');
    }

    _authenticate() {
        var self = this;
        return msRestAzure.loginWithServicePrincipalSecret(this._config.clientId, this._config.secret, this._config.tenantId).then(
            (credentials) => {
                self.ResourceManagementClient = new ResourceManagementClient(credentials, this._config.subscriptionId);
                self.KeyVaultManagementClient = new KeyVaultManagementClient(credentials, this._config.subscriptionId);

                // Service principal auth.
                self.credential = new DefaultAzureCredential();
            }
        );
    }

    _getKeyClient(vaultUrl, credential){
        return new KeyClient(vaultUrl, credential);
    }
    _getSecretClient(vaultUrl, credential){
        return new SecretClient(vaultUrl, credential);
    }
    _getCertificateClient(vaultUrl, credential){
        return new CertificateClient(vaultUrl, credential);
    }

    _prettyPrintJson(obj) {
        return JSON.stringify(obj, null, 2);
    }
    
    _sleep(ms) {
        return new Promise( (resolve) => { setTimeout(resolve, ms); } );
    }
    
    _createVault() {
        var self = this;
        var vaultName = this._getName('vault');

        var keyVaultParameters = {
            location: this._config.azureLocation,
            properties: {
                sku: {
                    name: 'standard'
                },
                accessPolicies: [
                    {
                        tenantId: this._config.tenantId,
                        objectId: this._config.objectId,
                        permissions: {
                            keys: KeyPermissions,
                            secrets: SecretPermissions,
                            certificates: CertificatePermissions,
                            storage: StoragePermissions
                        }
                    }
                ],
                tenantId: this._config.tenantId
            },
            tags: {}
        };

        console.log('\nCreating key vault: ' + vaultName);
        return self.KeyVaultManagementClient.vaults.createOrUpdate(this._config.groupName, vaultName, keyVaultParameters);
    }
}

KeyPermissions = [
    'encrypt',
    'decrypt',
    'wrapKey',
    'unwrapKey',
    'sign',
    'verify',
    'get',
    'list',
    'create',
    'update',
    'import',
    'delete',
    'backup',
    'restore',
    'recover',
    'purge'
]


SecretPermissions = [
    'get',
    'list',
    'set',
    'delete',
    'backup',
    'restore',
    'recover',
    'purge'
]


CertificatePermissions = [
    'get',
    'list',
    'delete',
    'create',
    'import',
    'update',
    'managecontacts',
    'getissuers',
    'listissuers',
    'setissuers',
    'deleteissuers',
    'manageissuers',
    'recover',
    'purge',
    'backup',
    'restore'
]


StoragePermissions = [
    'get',
    'list',
    'delete',
    'set',
    'update',
    'regeneratekey',
    'recover',
    'purge',
    'backup',
    'restore',
    'setsas',
    'listsas',
    'getsas',
    'deletesas'
]


var adjectives = ['able', 'acid', 'adept', 'aged', 'agile', 'ajar', 'alert', 'alive', 'all', 'ample',
              'angry', 'antsy', 'any', 'apt', 'arid', 'awake', 'aware', 'back', 'bad', 'baggy',
              'bare', 'basic', 'batty', 'beefy', 'bent', 'best', 'big', 'black', 'bland', 'blank',
              'bleak', 'blind', 'blond', 'blue', 'bogus', 'bold', 'bony', 'bossy', 'both', 'bowed',
              'brave', 'brief', 'brisk', 'brown', 'bulky', 'bumpy', 'burly', 'busy', 'cagey', 'calm',
              'cheap', 'chief', 'clean', 'close', 'cold', 'cool', 'corny', 'crazy', 'crisp', 'cruel',
              'curvy', 'cut', 'cute', 'damp', 'dark', 'dead', 'dear', 'deep', 'dense', 'dim',
              'dirty', 'dizzy', 'dopey', 'drab', 'dry', 'dual', 'dull', 'dull', 'each', 'eager',
              'early', 'easy', 'elite', 'empty', 'equal', 'even', 'every', 'evil', 'fair', 'fake',
              'far', 'fast', 'fat', 'few', 'fine', 'firm', 'five', 'flat', 'fond', 'four',
              'free', 'full', 'fuzzy', 'gamy', 'glib', 'glum', 'good', 'gray', 'grey', 'grim',
              'half', 'half', 'hard', 'high', 'hot', 'huge', 'hurt', 'icky', 'icy', 'ideal',
              'ideal', 'idle', 'ill', 'itchy', 'jaded', 'joint', 'juicy', 'jumbo', 'jumpy', 'jumpy',
              'keen', 'key', 'kind', 'known', 'kooky', 'kosher', 'lame', 'lame', 'lanky', 'large',
              'last', 'late', 'lazy', 'leafy', 'lean', 'left', 'legal', 'lewd', 'light', 'like',
              'limp', 'lined', 'live', 'livid', 'lone', 'long', 'loose', 'lost', 'loud', 'low',
              'loyal', 'lumpy', 'lush', 'mad', 'major', 'male', 'many', 'mealy', 'mean', 'meaty',
              'meek', 'mere', 'merry', 'messy', 'mild', 'milky', 'minor', 'minty', 'misty', 'mixed',
              'moist', 'moody', 'moral', 'muddy', 'murky', 'mushy', 'musty', 'mute', 'muted', 'naive',
              'nasty', 'near', 'neat', 'new', 'next', 'nice', 'nice', 'nine', 'nippy', 'nosy',
              'noted', 'novel', 'null', 'numb', 'nutty', 'obese', 'odd', 'oily', 'old', 'one',
              'only', 'open', 'other', 'our', 'oval', 'pale', 'past', 'perky', 'pesky', 'petty',
              'phony', 'pink', 'plump', 'plush', 'poor', 'posh', 'prime', 'prize', 'proud', 'puny',
              'pure', 'pushy', 'pushy', 'quick', 'quiet', 'rainy', 'rapid', 'rare', 'rash', 'raw',
              'ready', 'real', 'red', 'regal', 'rich', 'right', 'rigid', 'ripe', 'rosy', 'rough',
              'rowdy', 'rude', 'runny', 'sad', 'safe', 'salty', 'same', 'sandy', 'sane', 'scaly',
              'shady', 'shaky', 'sharp', 'shiny', 'short', 'showy', 'shut', 'shy', 'sick', 'silky',
              'six', 'slim', 'slimy', 'slow', 'small', 'smart', 'smug', 'soft', 'solid', 'some',
              'sore', 'soupy', 'sour', 'sour', 'spicy', 'spiky', 'spry', 'staid', 'stale', 'stark',
              'steel', 'steep', 'stiff', 'stout', 'sunny', 'super', 'sweet', 'swift', 'tall', 'tame',
              'tan', 'tart', 'tasty', 'taut', 'teeny', 'ten', 'tepid', 'testy', 'that', 'these',
              'thick', 'thin', 'third', 'this', 'those', 'tidy', 'tiny', 'torn', 'total', 'tough',
              'trim', 'true', 'tubby', 'twin', 'two', 'ugly', 'unfit', 'upset', 'urban', 'used',
              'used', 'utter', 'vague', 'vain', 'valid', 'vapid', 'vast', 'vexed', 'vital', 'vivid',
              'wacky', 'wan', 'warm', 'wary', 'wavy', 'weak', 'weary', 'wee', 'weepy', 'weird',
              'wet', 'which', 'white', 'whole', 'wide', 'wild', 'windy', 'wiry', 'wise', 'witty',
              'woozy', 'wordy', 'worn', 'worse', 'worst', 'wrong', 'wry', 'yummy', 'zany', 'zesty',
              'zonked'];

var nouns = ['abroad', 'abuse', 'access', 'act', 'action', 'active', 'actor', 'adult', 'advice', 'affair',
         'affect', 'age', 'agency', 'agent', 'air', 'alarm', 'amount', 'anger', 'angle', 'animal',
         'annual', 'answer', 'appeal', 'apple', 'area', 'arm', 'army', 'art', 'aside', 'ask',
         'aspect', 'assist', 'attack', 'author', 'award', 'baby', 'back', 'bad', 'bag', 'bake',
         'ball', 'band', 'bank', 'bar', 'base', 'basis', 'basket', 'bat', 'bath', 'battle',
         'beach', 'bear', 'beat', 'bed', 'beer', 'being', 'bell', 'belt', 'bench', 'bend',
         'bet', 'beyond', 'bid', 'big', 'bike', 'bill', 'bird', 'birth', 'bit', 'bite',
         'bitter', 'black', 'blame', 'blank', 'blind', 'block', 'blood', 'blow', 'blue', 'board',
         'boat', 'body', 'bone', 'bonus', 'book', 'boot', 'border', 'boss', 'bother', 'bottle',
         'bottom', 'bowl', 'box', 'boy', 'brain', 'branch', 'brave', 'bread', 'break', 'breast',
         'breath', 'brick', 'bridge', 'brief', 'broad', 'brown', 'brush', 'buddy', 'budget', 'bug',
         'bunch', 'burn', 'bus', 'button', 'buy', 'buyer', 'cable', 'cake', 'call', 'calm',
         'camera', 'camp', 'can', 'cancel', 'cancer', 'candle', 'candy', 'cap', 'car', 'card',
         'care', 'career', 'carpet', 'carry', 'case', 'cash', 'cat', 'catch', 'cause', 'cell',
         'chain', 'chair', 'chance', 'change', 'charge', 'chart', 'check', 'cheek', 'chest', 'child',
         'chip', 'choice', 'church', 'city', 'claim', 'class', 'clerk', 'click', 'client', 'clock',
         'closet', 'cloud', 'club', 'clue', 'coach', 'coast', 'coat', 'code', 'coffee', 'cold',
         'collar', 'common', 'cook', 'cookie', 'copy', 'corner', 'cost', 'count', 'county', 'couple',
         'course', 'court', 'cousin', 'cover', 'cow', 'crack', 'craft', 'crash', 'crazy', 'cream',
         'credit', 'crew', 'cross', 'cry', 'cup', 'curve', 'cut', 'cycle', 'dad', 'damage',
         'dance', 'dare', 'dark', 'data', 'date', 'day', 'dead', 'deal', 'dealer', 'dear',
         'death', 'debate', 'debt', 'deep', 'degree', 'delay', 'demand', 'depth', 'design', 'desire',
         'desk', 'detail', 'device', 'devil', 'diet', 'dig', 'dinner', 'dirt', 'dish', 'disk',
         'divide', 'doctor', 'dog', 'door', 'dot', 'double', 'doubt', 'draft', 'drag', 'drama',
         'draw', 'drawer', 'dream', 'dress', 'drink', 'drive', 'driver', 'drop', 'drunk', 'due',
         'dump', 'dust', 'duty', 'ear', 'earth', 'ease', 'east', 'eat', 'edge', 'editor',
         'effect', 'effort', 'egg', 'employ', 'end', 'energy', 'engine', 'entry', 'equal', 'error',
         'escape', 'essay', 'estate', 'event', 'exam', 'excuse', 'exit', 'expert', 'extent', 'eye',
         'face', 'fact', 'factor', 'fail', 'fall', 'family', 'fan', 'farm', 'farmer', 'fat',
         'father', 'fault', 'fear', 'fee', 'feed', 'feel', 'female', 'few', 'field', 'fight',
         'figure', 'file', 'fill', 'film', 'final', 'finger', 'finish', 'fire', 'fish', 'fix',
         'flight', 'floor', 'flow', 'flower', 'fly', 'focus', 'fold', 'food', 'foot', 'force',
         'form', 'formal', 'frame', 'friend', 'front', 'fruit', 'fuel', 'fun', 'funny', 'future',
         'gain', 'game', 'gap', 'garage', 'garden', 'gas', 'gate', 'gather', 'gear', 'gene',
         'gift', 'girl', 'give', 'glad', 'glass', 'glove', 'goal', 'god', 'gold', 'golf',
         'good', 'grab', 'grade', 'grand', 'grass', 'great', 'green', 'ground', 'group', 'growth',
         'guard', 'guess', 'guest', 'guide', 'guitar', 'guy', 'habit', 'hair', 'half', 'hall',
         'hand', 'handle', 'hang', 'harm', 'hat', 'hate', 'head', 'health', 'heart', 'heat',
         'heavy', 'height', 'hell', 'hello', 'help', 'hide', 'high', 'hire', 'hit', 'hold',
         'hole', 'home', 'honey', 'hook', 'hope', 'horror', 'horse', 'host', 'hotel', 'hour',
         'house', 'human', 'hunt', 'hurry', 'hurt', 'ice', 'idea', 'ideal', 'image', 'impact',
         'income', 'injury', 'insect', 'inside', 'invite', 'iron', 'island', 'issue', 'item', 'jacket',
         'job', 'join', 'joint', 'joke', 'judge', 'juice', 'jump', 'junior', 'jury', 'keep',
         'key', 'kick', 'kid', 'kill', 'kind', 'king', 'kiss', 'knee', 'knife', 'lab',
         'lack', 'ladder', 'lady', 'lake', 'land', 'laugh', 'law', 'lawyer', 'lay', 'layer',
         'lead', 'leader', 'league', 'leave', 'leg', 'length', 'lesson', 'let', 'letter', 'level',
         'lie', 'life', 'lift', 'light', 'limit', 'line', 'link', 'lip', 'list', 'listen',
         'living', 'load', 'loan', 'local', 'lock', 'log', 'long', 'look', 'loss', 'love',
         'low', 'luck', 'lunch', 'mail', 'main', 'major', 'make', 'male', 'mall', 'man',
         'manner', 'many', 'map', 'march', 'mark', 'market', 'master', 'match', 'mate', 'math',
         'matter', 'maybe', 'meal', 'meat', 'media', 'medium', 'meet', 'member', 'memory', 'menu',
         'mess', 'metal', 'method', 'middle', 'might', 'milk', 'mind', 'mine', 'minor', 'minute',
         'mirror', 'miss', 'mix', 'mobile', 'mode', 'model', 'mom', 'moment', 'money', 'month',
         'mood', 'most', 'mother', 'motor', 'mouse', 'mouth', 'move', 'movie', 'mud', 'muscle',
         'music', 'nail', 'name', 'nasty', 'nation', 'native', 'nature', 'neat', 'neck', 'nerve',
         'net', 'news', 'night', 'nobody', 'noise', 'normal', 'north', 'nose', 'note', 'notice',
         'novel', 'number', 'nurse', 'object', 'offer', 'office', 'oil', 'one', 'option', 'orange',
         'order', 'other', 'oven', 'owner', 'pace', 'pack', 'page', 'pain', 'paint', 'pair',
         'panic', 'paper', 'parent', 'park', 'part', 'party', 'pass', 'past', 'path', 'pause',
         'pay', 'peace', 'peak', 'pen', 'people', 'period', 'permit', 'person', 'phase', 'phone',
         'photo', 'phrase', 'piano', 'pick', 'pie', 'piece', 'pin', 'pipe', 'pitch', 'pizza',
         'place', 'plan', 'plane', 'plant', 'plate', 'play', 'player', 'plenty', 'poem', 'poet',
         'poetry', 'point', 'police', 'policy', 'pool', 'pop', 'post', 'pot', 'potato', 'pound',
         'power', 'press', 'price', 'pride', 'priest', 'print', 'prior', 'prize', 'profit', 'prompt',
         'proof', 'public', 'pull', 'punch', 'purple', 'push', 'put', 'queen', 'quiet', 'quit',
         'quote', 'race', 'radio', 'rain', 'raise', 'range', 'rate', 'ratio', 'raw', 'reach',
         'read', 'reason', 'recipe', 'record', 'red', 'refuse', 'region', 'regret', 'relief', 'remote',
         'remove', 'rent', 'repair', 'repeat', 'reply', 'report', 'resist', 'resort', 'rest', 'result',
         'return', 'reveal', 'review', 'reward', 'rice', 'rich', 'ride', 'ring', 'rip', 'rise',
         'risk', 'river', 'road', 'rock', 'role', 'roll', 'roof', 'room', 'rope', 'rough',
         'round', 'row', 'royal', 'rub', 'ruin', 'rule', 'run', 'rush', 'sad', 'safe',
         'safety', 'sail', 'salad', 'salary', 'sale', 'salt', 'sample', 'sand', 'save', 'scale',
         'scene', 'scheme', 'school', 'score', 'screen', 'screw', 'script', 'sea', 'search', 'season',
         'seat', 'second', 'secret', 'sector', 'self', 'sell', 'senior', 'sense', 'series', 'serve',
         'set', 'sex', 'shake', 'shame', 'shape', 'share', 'she', 'shift', 'shine', 'ship',
         'shirt', 'shock', 'shoe', 'shoot', 'shop', 'shot', 'show', 'shower', 'sick', 'side',
         'sign', 'signal', 'silly', 'silver', 'simple', 'sing', 'singer', 'single', 'sink', 'sir',
         'sister', 'site', 'size', 'skill', 'skin', 'skirt', 'sky', 'sleep', 'slice', 'slide',
         'slip', 'smell', 'smile', 'smoke', 'snow', 'sock', 'soft', 'soil', 'solid', 'son',
         'song', 'sort', 'sound', 'soup', 'source', 'south', 'space', 'spare', 'speech', 'speed',
         'spell', 'spend', 'spirit', 'spite', 'split', 'sport', 'spot', 'spray', 'spread', 'spring',
         'square', 'stable', 'staff', 'stage', 'stand', 'star', 'start', 'state', 'status', 'stay',
         'steak', 'steal', 'step', 'stick', 'still', 'stock', 'stop', 'store', 'storm', 'story',
         'strain', 'street', 'stress', 'strike', 'string', 'strip', 'stroke', 'studio', 'study', 'stuff',
         'stupid', 'style', 'suck', 'sugar', 'suit', 'summer', 'sun', 'survey', 'sweet', 'swim',
         'swing', 'switch', 'system', 'table', 'tackle', 'tale', 'talk', 'tank', 'tap', 'target',
         'task', 'taste', 'tax', 'tea', 'teach', 'team', 'tear', 'tell', 'tennis', 'term',
         'test', 'text', 'thanks', 'theme', 'theory', 'thing', 'throat', 'ticket', 'tie', 'till',
         'time', 'tip', 'title', 'today', 'toe', 'tone', 'tongue', 'tool', 'tooth', 'top',
         'topic', 'total', 'touch', 'tough', 'tour', 'towel', 'tower', 'town', 'track', 'trade',
         'train', 'trash', 'travel', 'treat', 'tree', 'trick', 'trip', 'truck', 'trust', 'truth',
         'try', 'tune', 'turn', 'twist', 'two', 'type', 'uncle', 'union', 'unique', 'unit',
         'upper', 'use', 'user', 'usual', 'value', 'vast', 'video', 'view', 'virus', 'visit',
         'visual', 'voice', 'volume', 'wait', 'wake', 'walk', 'wall', 'war', 'wash', 'watch',
         'water', 'wave', 'way', 'wealth', 'wear', 'web', 'week', 'weight', 'weird', 'west',
         'wheel', 'while', 'white', 'whole', 'wife', 'will', 'win', 'wind', 'window', 'wine',
         'wing', 'winner', 'winter', 'wish', 'woman', 'wonder', 'wood', 'word', 'work', 'worker',
         'world', 'worry', 'worth', 'wrap', 'writer', 'yard', 'year', 'yellow', 'you', 'young',
         'youth', 'zone'];

module.exports = KeyVaultSampleBase;


