---
services: key-vault
platforms: nodejs
author: lusitanian
---

# Recovery scenario samples for Azure Key Vault using the Azure Node SDK

This sample repo includes sample code demonstrating the soft delete, recovery and backup/restore features of Key Vault.

## How to run this sample

1. If you don't already have it, get [node.js](https://nodejs.org).

2. Clone the repo.

   ```
   git clone https://github.com/Azure-Samples/key-vault-node-recovery.git key-vault
   ```

3. Install the dependencies.

   ```
   cd key-vault
   npm install
   ```

4. Create an Azure service principal, using one of the following:
   - [Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
   - [PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
   - [Azure Portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/). 

    This service principal is to run the sample on your Azure account.

5. Set the following environment variables using the information from the service principal that you created.

   ```
   export AZURE_SUBSCRIPTION_ID={your subscription id}
   export AZURE_CLIENT_ID={your client id}
   export AZURE_CLIENT_SECRET={your client secret}
   export AZURE_TENANT_ID={your tenant id as a GUID}
   export AZURE_CLIENT_OID={Object id of the service principal}
   ```

> On Windows, use `set` instead of `export`.

6. Run the samples.

    ```
    node soft_delete_recovery_sample.js
    node backup_restore_sample.js
    ```

## What this sample does
This sample is broken into two main files.
`backup_restore_sample.js` demonstrates secret, key, and certificate backup and restore within a vault. 
`soft_delete_recovery_sample.js` demonstrates vault and secret-level soft delete, restore, and purging. 

## References and further reading

- [Azure SDK for Node.js](https://github.com/Azure/azure-sdk-for-node)
- [Azure KeyVault Documentation](https://azure.microsoft.com/en-us/documentation/services/key-vault/)
- [Key Vault REST API Reference](https://msdn.microsoft.com/en-us/library/azure/dn903609.aspx)
- [Manage Key Vault using CLI](https://azure.microsoft.com/en-us/documentation/articles/key-vault-manage-with-cli/)
- [Storing and using secrets in Azure](https://blogs.msdn.microsoft.com/dotnet/2016/10/03/storing-and-using-secrets-in-azure/)
