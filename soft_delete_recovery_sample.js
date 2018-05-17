// --------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for
// license information.
// --------------------------------------------------------------------------
'use strict;'

const KeyVaultSampleBase = require('./key_vault_sample_base');

const RETRY_404_WAIT_SEC = 3;
const DELETE_RECOVER_RETRY_COUNT = 15;

class SoftDeleteRecoverySample extends KeyVaultSampleBase {
    constructor() {
        super();
        this.vaultToRecover = null;
        this.vaultToPurge = null;
        this.secretsRecoveryVault = null;
        this.numVaultsPrecreated = 3;
    }

    async runSample() {
        var self = this;

        await self._authenticate();
        await self._precreateVaults();
        await self.deletedVaultRecovery();
        await self.deletedSecretRecovery();
        await self._cleanupSampleVaults();
    }

    async getFollowingPages(nextLink, returnedResults, nextPageFunction) {
        var self = this;
        if (!nextLink) {
            return returnedResults;
        }

        var nextPage = await nextPageFunction(nextLink);

        returnedResults = returnedResults.concat(nextPage);
        return await self.getFollowingPages(nextPage.nextLink, returnedResults, nextPageFunction);
    }

    async listAllPages(firstPageFunction, nextPageFunction) {
        var self = this;
        var results = await firstPageFunction();
        return await self.getFollowingPages(results.nextLink, results, nextPageFunction);
    }

    async listVaults() {
        var self = this;
        return await self.listAllPages( () => self.KeyVaultManagementClient.vaults.list(), nextLink => self.KeyVaultManagementClient.vaults.listNext(nextLink) );
    }

    async listDeletedVaults() {
        var self = this;
        return await self.listAllPages( () => self.KeyVaultManagementClient.vaults.listDeleted(), nextLink => self.KeyVaultManagementClient.vaults.listDeletedNext(nextLink));
    }

    async listSecrets(vaultUri) {
        var self = this;
        return await self.listAllPages( () => self.KeyVaultClient.getSecrets(vaultUri), nextLink => self.KeyVaultClient.getSecretsNext(nextLink) );
    }

    async listDeletedSecrets(vaultUri) {
        var self = this;
        return await self.listAllPages( () => self.KeyVaultClient.getDeletedSecrets(vaultUri), nextLink => self.KeyVaultClient.getDeletedSecretsNext(nextLink) );
    }

    async pollWhile404(retryCount, promiseGenerator) {
        var self = this;

        if (!retryCount) {
            throw new Error("Retry count exceeded");
        }

        try {
            return await promiseGenerator();
        } catch(err) {
            if (!err.response ||
                !err.response.statusCode ||
                err.response.statusCode !== 404
                || retryCount === 1
            ) {
                throw err;
            }
            await self._sleep(RETRY_404_WAIT_SEC * 1000);
            return await self.pollWhile404(retryCount - 1, promiseGenerator);
        }
    }

    async performOpAndWaitForCompletion(performOpFunction, pollForCompletionFunction) {
        var self = this;
        await performOpFunction();
        return await self.pollWhile404(DELETE_RECOVER_RETRY_COUNT, pollForCompletionFunction);
    }

    async deleteVault(resourceGroup, vault) {
        var self = this;
        var vaultName = vault.name;
        var vaultLocation = vault.location;

        return self.performOpAndWaitForCompletion(
            () => self.KeyVaultManagementClient.vaults.deleteMethod(resourceGroup, vaultName),
            () => self.KeyVaultManagementClient.vaults.getDeleted(vaultName, vaultLocation));
    }

    async deleteSecret(vaultUri, secretName) {
        var self = this;
        return self.performOpAndWaitForCompletion(
            () => self.KeyVaultClient.deleteSecret(vaultUri, secretName),
            () => self.KeyVaultClient.getDeletedSecret(vaultUri, secretName));
    }

    async recoverDeletedSecret(vaultUri, secretName) {
        var self = this;
        return self.performOpAndWaitForCompletion(
            () => self.KeyVaultClient.recoverDeletedSecret(vaultUri, secretName),
            () => self.KeyVaultClient.getSecret(vaultUri, secretName, '')
        );
    }

    async purgeVault(deletedVault) {
        var self = this;
        return self.KeyVaultManagementClient.vaults.purgeDeleted(deletedVault.name, deletedVault.properties.location);
    }

    async recoverVault(deletedVault, resourceGroup, tenantId) {
        var self = this;

        //
        // This is the minimum set of parameters to recover a deletedVault.
        //
        var recoveryParameters =
        {
            location: deletedVault.properties.location,
            properties: {
                createMode: 'recover',
                tenantId: tenantId,
                sku: {
                    name: 'standard'
                },
                accessPolicies: []
            }
        };

        console.log('Recovering vault ' + deletedVault.name);
        var recoveredVault = await self.KeyVaultManagementClient.vaults.createOrUpdate(resourceGroup, deletedVault.name, recoveryParameters);
        console.log('Recovered vault ' + recoveredVault.name);
    }

    async getDeletedVault(name, location) {
        var self = this;
        return await self.KeyVaultManagementClient.vaults.getDeleted(name, location);
    }

    async createSoftDeleteEnabledVault() {
        var self = this;
        var vaultName = self._getName('vault');

        var keyVaultParameters = {
            location: self._config.location,
            properties: {
                sku: {
                    name: 'standard'
                },
                accessPolicies: [
                    {
                        tenantId: self._config.tenantId,
                        objectId: self._config.clientOid,
                        permissions: {
                            keys: KeyPermissions,
                            secrets: SecretPermissions,
                            certificates: CertificatePermissions,
                            storage: StoragePermissions
                        }
                    }
                ],
                tenantId: self._config.tenantId
            },
            tags: {}
        };
        // this vault property controls whether recovery functionality is available on the vault itself as well as
        // all keys, certificates and secrets in the vault as well
        // NOTE: This value should only be undefined or true, setting the value to false will cause a service validation error
        //       once soft delete has been enabled on the vault it cannot be disabled
        keyVaultParameters.properties.enableSoftDelete = true;


        console.log('\nCreating soft delete enabled vault: ' + vaultName);
        var vault = await self.KeyVaultManagementClient.vaults.createOrUpdate(self._config.resourceGroupName, vaultName, keyVaultParameters);
        console.log('Vault ' + vaultName + ' created enableSoftDelete=' + vault.properties.enableSoftDelete);
        return vault;
    }

    async enableSoftDeleteOnExistingVault() {
        var self = this;

        // create a vault without soft delete enabled
        var sampleVault = await _createVault();

        // this vault property controls whether recovery functionality is available on the vault itself as well as
        // all keys, certificates and secrets in the vault as well
        // NOTE: This value should only be undefined or true, setting the value to false will cause a service validation error
        //       once soft delete has been enabled on the vault it cannot be disabled
        sampleVault.properties.enableSoftDelete = true
        await self.KeyVaultManagementClient.vaults.createOrUpdate(self._config.resourceGroupName, sampleVault.name, sampleVault.properties);
        console.log('Updated vault ' + sampleVault.name + ' enableSoftDelete=' + sampleVault.properties.enableSoftDelete);
    }

    async deletedVaultRecovery() {
        var self = this;
        //a sample of enumerating, retrieving, recovering and purging deleted key vaults
        // create vaults enabling the soft delete feature on each

        //
        // Create two vaults.  One will be recovered and one will be purged.  This is done in parallel
        // as vault creation can take as long as 30 seconds.
        //
        console.log('Soft deleting two vaults: ' + self.vaultToRecover.name + ', ' + self.vaultToPurge.name);

        var vaultDeletePromises = [];
        vaultDeletePromises.push( self.deleteVault(self._config.resourceGroupName, self.vaultToRecover) );
        vaultDeletePromises.push( self.deleteVault(self._config.resourceGroupName, self.vaultToPurge) );
        await Promise.all(vaultDeletePromises);

        //
        // Show how to list all currently deleted vaults.
        //
        console.log('Getting list of deleted vaults.');
        var deletedVaults = await self.listDeletedVaults();

        var foundVaultToRecover = deletedVaults.find( vault => vault.name === self.vaultToRecover.name );
        var foundVaultToPurge = deletedVaults.find( vault => vault.name === self.vaultToPurge.name );

        if (foundVaultToRecover && foundVaultToPurge) {
            console.log('Found both vaults in list of deleted vaults.')
        } else {
            throw new Error('Unable to find both vaults in list of deleted vaults.')
        }

        //
        // Demonstrate retrieving details about a deleted vault and recovering it.
        //
        console.log('Retrieving details of deleted vault ' + self.vaultToRecover.name);
        var deletedVault = await self.getDeletedVault(self.vaultToRecover.name, self.vaultToRecover.location)
        console.log(self._prettyPrintJson(deletedVault) + '\n');
        await self.recoverVault(deletedVault, self._config.resourceGroupName, self._config.tenantId);

        //
        // Demonstrate purging a vault.
        //
        console.log('Retrieving details of deleted vault ' + self.vaultToPurge.name);
        var purgeVault = await self.getDeletedVault(self.vaultToPurge.name, self.vaultToPurge.location)
        console.log(self._prettyPrintJson(purgeVault) + '\n');
        console.log('Purging vault ' + purgeVault.name);
        await self.purgeVault(purgeVault);
        console.log('Purged vault ' + purgeVault.name);
    }

    async deletedSecretRecovery() {
        var self = this;

        var secretToRecover = self._getName("secret");
        var secretToPurge = self._getName("secret");

        var recoveryVaultUri = self.secretsRecoveryVault.properties.vaultUri;

        var secret = await self.KeyVaultClient.setSecret(recoveryVaultUri, secretToRecover, 'secret to restore');
        console.log('Created secret: ' + self._prettyPrintJson(secret));

        secret = await self.KeyVaultClient.setSecret(recoveryVaultUri, secretToPurge, 'secret to purge');
        console.log('Created secret: ' + self._prettyPrintJson(secret));

        // List secrets
        var secretsList = await self.listSecrets(recoveryVaultUri);
        console.log('Secrets: ' + self._prettyPrintJson(secretsList));

        var deletionPromises = [];
        deletionPromises.push(self.deleteSecret(recoveryVaultUri, secretToRecover));
        deletionPromises.push(self.deleteSecret(recoveryVaultUri, secretToPurge));
        var deletionResults = await Promise.all(deletionPromises);
        console.log('Data: ' + self._prettyPrintJson(deletionResults, null, 2));

        console.log('Deleted ' + secretToRecover + ' and ' + secretToPurge);

        secretsList = await self.listDeletedSecrets(recoveryVaultUri);
        console.log('Deleted Secrets: ' + self._prettyPrintJson(secretsList));

        await self.recoverDeletedSecret(recoveryVaultUri, secretToRecover);
        console.log('Recovered ' + secretToRecover);

        await self.KeyVaultClient.purgeDeletedSecret(recoveryVaultUri, secretToPurge);
        console.log('Purged ' + secretToPurge);

        secretsList = await self.listSecrets(recoveryVaultUri);
        console.log('Remaining secrets: ' + self._prettyPrintJson(secretsList));
    }

    async _precreateVaults() {
        var self = this;
        var vaultCreatePromises = [];

        for (var i = 0; i < self.numVaultsPrecreated; i++) {
            vaultCreatePromises.push(self.createSoftDeleteEnabledVault());
        }

        var vaults = await Promise.all(vaultCreatePromises);
        self.vaultToRecover = vaults[0];
        self.vaultToPurge = vaults[1];
        self.secretsRecoveryVault = vaults[2];
    }

    _filterSampleVaults(vaults) {
        return vaults.filter( vault => vault.name.match('vault-[a-z]+-[a-z]+-[0-9]+') );
    }

    async _listSampleVaults() {
        var self = this;
        var vaults = await self.listVaults();
        return self._filterSampleVaults(vaults);
    }

    async _deleteVaults(vaults) {
        var self = this;
        return Promise.all(vaults.map( vault => self.deleteVault(self._config.resourceGroupName, vault) ));
    }

    async _listSampleDeletedVaults() {
        var self = this;
        var deletedVaults = await self.listDeletedVaults();
        return self._filterSampleVaults(deletedVaults);
    }

    _purgeVaults(deletedVaults) {
        var self = this;
        return Promise.all(deletedVaults.map( vault => self.purgeVault(vault) ));
    }

    async _deleteSampleVaults() {
        var self = this;
        var vaults = await self._listSampleVaults();
        console.log('Found ' + vaults.length + ' sample vaults.');
        return await self._deleteVaults(vaults);
    }

    async _purgeSampleVaults() {
        var self = this;
        var deletedVaults = await self._listSampleDeletedVaults();
        console.log('Found ' + deletedVaults.length + ' deleted sample vaults.');
        return await self._purgeVaults(deletedVaults);
    }

    async _cleanupSampleVaults() {
        var self = this;
        console.log('Cleaning up remaining sample vaults.');
        await self._deleteSampleVaults();
        await self._purgeSampleVaults();
        console.log('Purged all sample vaults.');
    }
}

if (require.main === module) {
    var softDeleteRecoverySample = new SoftDeleteRecoverySample();
    softDeleteRecoverySample.runSample()
        .catch( (err) => { console.log('Encountered an error: ' + err); });
}