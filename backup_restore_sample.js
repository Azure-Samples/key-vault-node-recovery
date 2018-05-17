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

        await self._authenticate(false)
        await self.backupRestoreKey();
        //.then( () => { return self.backupRestoreSecret();          })
        await self.backupRestoreCertificate();
        //await self.backupRestoreStorageAccount();
    }

    async backupRestoreKey() {
        var self = this;
        var keyName;
        var firstVault;
        var secondVault;
        var keyBackup;

        console.log('************************************');
        console.log('  Key backup and restore sample.    ');
        console.log('************************************');

        var vault = await self._createVault()
        firstVault = vault;
        keyName = self._getName('key');
        var key = await self.KeyVaultClient.createKey(firstVault.properties.vaultUri, keyName, 'RSA');

        console.log('created key ' + keyName);
        console.log('Backing up key.');
        var backup = await self.KeyVaultClient.backupKey(firstVault.properties.vaultUri, keyName);

        keyBackup = backup;
        console.log('backed up key ' + keyName);
        vault = await self._createVault();

        secondVault = vault;
        console.log('Restoring');
        var restored = await self.KeyVaultClient.restoreKey(secondVault.properties.vaultUri, keyBackup.value);

        console.log('restored secret ' + keyName);
        var keys = await self.KeyVaultClient.getKeys(secondVault.properties.vaultUri);

        console.log('vault ' + secondVault.name +  ' keys:');
        for(var i = 0; i < keys.length; i++) {
            console.log('  kid: ' + keys[i].kid);
        }
    }

    async backupRestoreSecret() {
        var self = this;
        var secretName;
        var firstVault;
        var secondVault;
        var secretBackup;

        console.log('************************************');
        console.log('  Secret backup and restore sample. ');
        console.log('************************************');

        var vault = await self._createVault()

        firstVault = vault;

        secretName = self._getName('secret');
        console.log('Creating secret: ' + secretName);
        var secret = await self.KeyVaultClient.setSecret(firstVault.properties.vaultUri, secretName, 'AValue', 'RSA');

        console.log('created secret ' + secretName);
        console.log('Backing up secret');
        var backup = await self.KeyVaultClient.backupSecret(firstVault.properties.vaultUri, secretName);

        secretBackup = backup;
        console.log('backed up secret ' + secretName);
        vault = await self._createVault();

        secondVault = vault;

        console.log('Restoring.');
        var restored = await self.KeyVaultClient.restoreSecret(secondVault.properties.vaultUri, secretBackup.value);

        console.log('restored secret ' + secretName);
        var secrets = await self.KeyVaultClient.getSecrets(secondVault.properties.vaultUri);

        console.log('vault ' + secondVault.name +  ' secrets:');
        for(var i = 0; i < secrets.length; i++) {
            console.log('  kid: ' + secrets[i].kid);
        }
    }

    async backupRestoreCertificate() {
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

        var self = this;
        var certificateName;
        var firstVault;
        var secondVault;
        var certificateBackup;

        console.log('******************************************');
        console.log('  Certificate backup and restore sample.  ');
        console.log('******************************************');

        var vault = await self._createVault()

        firstVault = vault;

        certificateName = self._getName('certificate');
        console.log('Creating certificate: ' + certificateName);
        var certificate = await self.KeyVaultClient.createCertificate(firstVault.properties.vaultUri, certificateName, certPolicyOptions);

        console.log('created certificate ' + certificateName);
        console.log('Backing up certificate.');
        var backup = await self.KeyVaultClient.backupCertificate(firstVault.properties.vaultUri, certificateName);

        certificateBackup = backup;
        console.log('backed up certificate ' + certificateName);
        vault = await self._createVault();

        secondVault = vault;

        console.log('Restoring.');
        var restored = await self.KeyVaultClient.restoreCertificate(secondVault.properties.vaultUri, certificateBackup.value);

        console.log('restored certificate ' + certificateName);
        var certificates = await self.KeyVaultClient.getCertificates(secondVault.properties.vaultUri);

        console.log('vault ' + secondVault.name +  ' certificates:');
        for(var i = 0; i < certificates.length; i++) {
            console.log('  kid: ' + certificates[i].kid);
        }
    }

    /**
     * To run the following sample you must have set up a storage account and then given Key Vault
     * "Storage Account Key Operator Service Role".  Once the storage account is created
     * giving Key Vault the correct role assignment can be done with the steps here:
     *
     * 1. Get the resource ID of the Azure Storage Account you want to manage.
     *
     * $storage = Get-AzureRmStorageAccount -ResourceGroupName 'mystorageResourceGroup' -StorageAccountName 'mystorage'
     *  or
     * az storage account show --resource-group mystorageResourceGroup --name mystorage
     *
     * 1.  Get ObjectId of Azure Key Vault Identity
     *
     * $servicePrincipal = Get-AzureRmADServicePrincipal -ServicePrincipalName cfa8b339-82a2-471a-a3c9-0fc0be7a4093
     *  or
     * az ad sp show --id cfa8b339-82a2-471a-a3c9-0fc0be7a4093
     *
     * 1.  Assign Storage Key Operator role to Azure Key Vault Identity
     *
     * New-AzureRmRoleAssignment -ObjectId $servicePrincipal.Id -RoleDefinitionName 'Storage Account Key Operator Service Role' -Scope $storage.Id
     *  or
     * az role assignment create --assignee "objectIdFrom#2" --role "Storage Account Key Operator Service Role" --scope "storageIdFrom#1"
     */
    async backupRestoreStorageAccount() {
        var self = this;
        var storageAccountName;
        var firstVault;
        var secondVault;
        var storageAccountBackup;
        var userOid

        console.log('*********************************************');
        console.log('  Storage Account backup and restore sample. ');
        console.log('*********************************************');

        var oid = await self._getUserOid()

        userOid = oid;
        var vault = await self._createVault();

        firstVault = vault;
        await self._addUserToVaultPolicy(userOid, vault);

        storageAccountName = self._getStorageAccountName();
        console.log('Creating storage account: ' + storageAccountName);
        var storageAccount = await self.UserKeyVaultClient.setStorageAccount(
            firstVault.properties.vaultUri,
            storageAccountName,
            self._config.storage_resource_id,
            'key1',
            false);

            console.log('created storageAccount ' + storageAccountName);
        console.log('Backing up storage account.');
        var backup = await self.KeyVaultClient.backupStorageAccount(firstVault.properties.vaultUri, storageAccountName);

        storageAccountBackup = backup;
        console.log('backed up storageAccount ' + storageAccountName);
        vault = await self._createVault();

        secondVault = vault;

        console.log('Restoring storage account: ' + storageAccountName);
        var restored = await self.KeyVaultClient.restoreStorageAccount(secondVault.properties.vaultUri, storageAccountBackup.value);

        console.log('restored storageAccount ' + storageAccountName);
        var storageAccounts = await self.KeyVaultClient.getStorageAccounts(secondVault.properties.vaultUri);

        console.log('vault ' + secondVault.name +  ' storageAccounts:');
        for(var i = 0; i < storageAccounts.length; i++) {
            console.log('  id: ' + storageAccounts[i].id);
        }
    }
}

if (require.main === module) {
    var backupRestoreSample = new BackupRestoreSample();
    backupRestoreSample.runSample()
        .catch( (err) => { console.log('Encountered an error: ' + err); });
}