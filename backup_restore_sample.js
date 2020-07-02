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
        const vaultClientForBackup = self._getKeyClient(self._firstVault.properties.vaultUri);
        var key = await vaultClientForBackup.createKey(keyName, 'RSA');

        console.log('Created key ' + keyName);
        console.log('Backing up key.');
        var keyBackup = await vaultClientForBackup.backupKey(keyName);

        console.log('Backed up key ' + keyName);

        console.log('Restoring');
        const vaultClientForRestore = self._getKeyClient(self._secondVault.properties.vaultUri);
        var restored = await vaultClientForRestore.restoreKeyBackup(keyBackup)

        console.log('Restored key ' + keyName);
        var keys = await vaultClientForRestore.listPropertiesOfKeys();

        console.log('Vault ' + self._secondVault.name +  ' keys:');
        for await (const keyProperties of keys) {
            console.log('  kid: ' + keyProperties.kid);
        }
    }

    async backupRestoreSecret() {
        var self = this;

        console.log('************************************');
        console.log('  Secret backup and restore sample. ');
        console.log('************************************');

        var secretName = self._getName('secret');
        const vaultClientForBackup = self._getSecretClient(self._firstVault.properties.vaultUri);
        var secret = await vaultClientForBackup.setSecret(secretName, 'AValue');

        console.log('Created secret: ' + secretName);
        console.log(secret);
        
        console.log('Backing up secret');
        var secretBackup = await vaultClientForBackup.backupSecret(secretName);
        
        console.log('Backed up secret ' + secretName);
        console.log('Restoring.');
        const vaultClientForRestore = self._getSecretClient(self._secondVault.properties.vaultUri);
        var restored = await vaultClientForRestore.restoreSecretBackup(secretBackup);

        console.log('Restored secret ' + secretName);
        var secrets = await vaultClientForRestore.listPropertiesOfSecrets();

        console.log('Vault ' + self._secondVault.name +  ' secrets:');
        for await (const secretProperties of secrets) {
            console.log('  Secret ID: ' + secretProperties.id);
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
        const vaultClientForBackup = self._getCertificateClient(self._firstVault.properties.vaultUri);
        console.log('Creating certificate: ' + certificateName);
        var certificate = await vaultClientForBackup.beginCreateCertificate(certificateName, certPolicyOptions);
        await certificate.pollUntilDone();
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

        console.log('Restoring.');
        const vaultClientForRestore = self._getCertificateClient(self._secondVault.properties.vaultUri);
        var restored = await vaultClientForRestore.restoreCertificateBackup(certificateBackup);
        console.log(restored);
        
        console.log('Restored certificate ' + certificateName);
        var certificates = await vaultClientForRestore.listPropertiesOfCertificates();

        console.log('Vault ' + self._secondVault.name +  ' certificates:');
        for await (const certificateProperties of certificates) {
            console.log('  ID: ' + certificateProperties.id);
        }
    }
}

if (require.main === module) {
    var backupRestoreSample = new BackupRestoreSample();
    backupRestoreSample.runSample()
        .catch( (err) => { console.log(err.stack); });
}