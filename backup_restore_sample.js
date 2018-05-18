// --------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for
// license information.
// --------------------------------------------------------------------------
'use strict;'

const KeyVaultSampleBase = require('./key_vault_sample_base');

class BackupRestoreSample extends KeyVaultSampleBase {
    async runSample() {
        var self = this;
        
        // Authenticate to Key Vault and set up our Key Vault Client and Management Client
        await self._authenticate(); 
        
        // Create two key vaults for sample purposes
        self._firstVault = await self._createVault();
        self._secondVault = await self._createVault();
        
        // Run our individual backup and restore samples now that setup is complete
        await self.backupRestoreKey();
        await self.backupRestoreSecret();
        await self.backupRestoreCertificate();
    }

    async backupRestoreKey() {
        var self = this;
        
        console.log('************************************');
        console.log('  Key backup and restore sample.    ');
        console.log('************************************');


        var keyName = self._getName('key');
        var key = await self.KeyVaultClient.createKey(self._firstVault.properties.vaultUri, keyName, 'RSA');

        console.log('Created key ' + keyName);
        console.log('Backing up key.');
        var keyBackup = await self.KeyVaultClient.backupKey(self._firstVault.properties.vaultUri, keyName);
        
        console.log('Backed up key ' + keyName);
        
        console.log('Restoring');
        var restored = await self.KeyVaultClient.restoreKey(self._secondVault.properties.vaultUri, keyBackup.value);

        console.log('Restored key ' + keyName);
        var keys = await self.KeyVaultClient.getKeys(self._secondVault.properties.vaultUri);

        console.log('Vault ' + self._secondVault.name +  ' keys:');
        for(var i = 0; i < keys.length; i++) {
            console.log('  kid: ' + keys[i].kid);
        }
    }

    async backupRestoreSecret() {
        var self = this;

        console.log('************************************');
        console.log('  Secret backup and restore sample. ');
        console.log('************************************');

        var secretName = self._getName('secret');
        var secret = await self.KeyVaultClient.setSecret(self._firstVault.properties.vaultUri, secretName, 'AValue');

        console.log('Created secret: ' + secretName);
        console.log(secret);
        
        console.log('Backing up secret');
        var secretBackup = await self.KeyVaultClient.backupSecret(self._firstVault.properties.vaultUri, secretName);
        
        console.log('Backed up secret ' + secretName);
        console.log('Restoring.');
        var restored = await self.KeyVaultClient.restoreSecret(self._secondVault.properties.vaultUri, secretBackup.value);

        console.log('Restored secret ' + secretName);
        var secrets = await self.KeyVaultClient.getSecrets(self._secondVault.properties.vaultUri);

        console.log('Vault ' + self._secondVault.name +  ' secrets:');
        for(var i = 0; i < secrets.length; i++) {
            console.log('  Secret ID: ' + secrets[i].id);
        }
    }

    async backupRestoreCertificate() {
        var self = this;
        var certPolicyOptions = {
            'certificatePolicy': {
                'keyProperties': {
                    'keySize': 4096,
                    'reuseKey': false
                },
                'issuerParameters': {
                    'name': 'Self'
                },
                'x509CertificateProperties': {
                    'subject': 'CN=www.contoso.com',
                    'validityInMonths': 12
                }
            },
            'certificateAttributes': {
                'enabled': true
            }
        };

        

        console.log('******************************************');
        console.log('  Certificate backup and restore sample.  ');
        console.log('******************************************');


        var certificateName = self._getName('certificate');
        console.log('Creating certificate: ' + certificateName);
        var certificate = await self.KeyVaultClient.createCertificate(self._firstVault.properties.vaultUri, certificateName, certPolicyOptions);

        console.log('Created certificate ' + certificateName);
        console.log('Backing up certificate.');
        var certificateBackup = await self.KeyVaultClient.backupCertificate(self._firstVault.properties.vaultUri, certificateName);

        console.log('Backed up certificate ' + certificateName);

        console.log('Restoring.');
        var restored = await self.KeyVaultClient.restoreCertificate(self._secondVault.properties.vaultUri, certificateBackup.value);
        console.log(restored);
        
        console.log('Restored certificate ' + certificateName);
        var certificates = await self.KeyVaultClient.getCertificates(self._secondVault.properties.vaultUri);

        console.log('Vault ' + self._secondVault.name +  ' certificates:');
        for(var i = 0; i < certificates.length; i++) {
            console.log('  ID: ' + certificates[i].id);
        }
    }
}

if (require.main === module) {
    var backupRestoreSample = new BackupRestoreSample();
    backupRestoreSample.runSample()
        .catch( (err) => { console.log(err.stack); });
}