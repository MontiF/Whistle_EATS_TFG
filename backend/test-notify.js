const cds = require('@sap/cds');

(async () => {
    try {
        // Bootstrap CDS context
        await cds.connect.to('db'); // Ensure DB is connected
        const srv = await cds.connect.to('CatalogService');

        console.log('Connected to CatalogService');

        // Invoke the unbound action
        // In CAP, unbound actions are methods on the service instance
        const result = await srv.sendTestNotification({ userId: '33333333-3333-3333-3333-333333333333' });

        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    }
})();
