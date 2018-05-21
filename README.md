---
services: key-vault
platforms: nodejs
author: lusitanian
---

# Recovery scenario samples for Azure Key Vault using the Azure Node SDK

This sample repo includes sample code demonstrating the soft delete, recovery and backup/restore features of Key Vault.

## Prerequisites
 * node.js 8+
 * An Azure Service Principal for running the sample on your Azure account. You can create an Azure service principal using one of the following guides:
     - [Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
     - [PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
     - [Azure Portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/). 

     
## Quickstart
1. If you don't have it, install [node.js](https://nodejs.org)
2. Set the following environment variables using the information from your service principal.
   ```
   export AZURE_SUBSCRIPTION_ID={your subscription id}
   export AZURE_CLIENT_ID={your client id}
   export AZURE_CLIENT_SECRET={your client secret}
   export AZURE_TENANT_ID={your tenant id as a GUID}
   export AZURE_CLIENT_OID={Object id of the service principal}
   ```
   > On Windows, use `set` instead of `export`.

3. Clone the repo, install node packages, and run (the backup/restore and soft delete/recover samples live in two separate files)
     ```
     git clone https://github.com/Azure-Samples/key-vault-recovery-node.git key-vault
     cd key-vault
     npm install
     node backup_restore_sample.js
     node soft_delete_recovery_sample.js
     ```

## What does this sample do?
For backup and restore, in `backup_restore_sample.js`, the entry point is the method `runSample` which runs the following:
  ```
  async runSample() {
          var self = this;
          
          // Authenticate to Key Vault and set up our Key Vault Client and Management Client
          await self._authenticate(); 
          
          // Create two key vaults for sample purposes
          self._firstVault = await self._createVault();
          self._secondVault = await self._createVault();
          
          // Run our individual backup and restore samples now that setup is complete
          await self.backupRestoreKey(); // backup key from vault 1; restore to vault 2
          await self.backupRestoreSecret(); // backup a secret from vault 1; restore to vault 2
          await self.backupRestoreCertificate(); // backup a secret from vault 1; restore to vault 2
      }
  ```

For soft delete and recovery, in `soft_delete_recovery_sample.js`, we similarly see:
  ```
  async runSample() {
      var self = this;

      await self._authenticate();         // authenticate to the key vault service
      await self._precreateVaults();      // create sample vaults
      await self.deletedVaultRecovery();  // demonstrate deleting and recovering vaults
      await self.deletedSecretRecovery(); // demonstrate deleting and recovering secrets 
      await self._cleanupSampleVaults();  // clean up our sample vaults
  }
  ```

## References and further reading

- [Azure SDK for Node.js](https://github.com/Azure/azure-sdk-for-node)
- [Azure KeyVault Documentation](https://azure.microsoft.com/en-us/documentation/services/key-vault/)
- [Key Vault REST API Reference](https://msdn.microsoft.com/en-us/library/azure/dn903609.aspx)
- [Manage Key Vault using CLI](https://azure.microsoft.com/en-us/documentation/articles/key-vault-manage-with-cli/)
- [Storing and using secrets in Azure](https://blogs.msdn.microsoft.com/dotnet/2016/10/03/storing-and-using-secrets-in-azure/)
