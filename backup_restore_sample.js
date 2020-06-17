// --------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for
// license information.
// --------------------------------------------------------------------------
'use strict;'

const KeyVaultSampleBase = require('./key_vault_sample_base');
const { KeyClient } = require("@azure/keyvault-keys");
const { SecretClient } = require("@azure/keyvault-secrets");
const { CertificateClient } = require("@azure/keyvault-certificates");


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
        const vaultClientForBackup = new KeyClient(self._firstVault.properties.vaultUri, self.credential);
        var key = await vaultClientForBackup.createKey(keyName, 'RSA');


        console.log('Created key ' + keyName);
        console.log('Backing up key.');
        var keyBackup = await vaultClientForBackup.backupKey(keyName);

        
        console.log('Backed up key ' + keyName);


        const vaultClientForRestore = new KeyClient(self._secondVault.properties.vaultUri, self.credential);
        console.log('Restoring');
        var restored = await vaultClientForRestore.restoreKeyBackup(keyBackup)
        restored.name
        console.log('Restored key ' + keyName);
        var keys = await vaultClientForRestore.getKey(keyName);

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
        const vaultClientForBackup = new SecretClient(self._firstVault.properties.vaultUri, self.credential);
        var secret = await vaultClientForBackup.setSecret(secretName, 'AValue');

        console.log('Created secret: ' + secretName);
        console.log(secret);
        
        console.log('Backing up secret');
        var secretBackup = await vaultClientForBackup.backupSecret(secretName);
        
        console.log('Backed up secret ' + secretName);


        const vaultClientForRestore = new SecretClient(self._secondVault.properties.vaultUri, self.credential);


        console.log('Restoring.');
        var restored = await vaultClientForRestore.restoreSecretBackup(secretBackup);

        console.log('Restored secret ' + secretName);
        var secrets = await vaultClientForRestore.getSecret(secretName);

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
                }
            },
            'issuerName': 'Self',
            'subject': 'CN=www.contoso.com',
            'x509CertificateProperties': {
                'validityInMonths': 12
            },
            'certificateAttributes': {
                'enabled': true
            }
        };

        

        console.log('******************************************');
        console.log('  Certificate backup and restore sample.  ');
        console.log('******************************************');


        var certificateName = self._getName('certificate');
        const vaultClientForBackup = new CertificateClient(self._firstVault.properties.vaultUri, self.credential);

        console.log('Creating certificate: ' + certificateName);
        var certificate = await vaultClientForBackup.beginCreateCertificate(certificateName, certPolicyOptions);
        console.log('Created certificate ' + certificateName);
        
        var certOp = await vaultClientForBackup.getCertificateOperation(certificateName);
        
        // wait for cert to actually be created
        while( certOp.status == 'inProgress' ) {
          certOp = await vaultClientForBackup.getCertificateOperation(certificateName);
          await self._sleep(1000);
        }
        
        console.log('Backing up certificate.');
        var certificateBackup = await vaultClientForBackup.backupCertificate(certificateName);

        console.log('Backed up certificate ' + certificateName);

        const vaultClientForRestore = new CertificateClient(self._secondVault.properties.vaultUri, self.credential);


        console.log('Restoring.');
        var restored = await vaultClientForRestore.restoreCertificateBackup(certificateBackup);
        console.log(restored);
        
        console.log('Restored certificate ' + certificateName);
        var certificates = await vaultClientForRestore.getCertificate(certificateName);

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