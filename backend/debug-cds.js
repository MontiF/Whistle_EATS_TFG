const cds = require('@sap/cds');
const http = require('http');

(async () => {
    try {
        console.log('Loading CDS model...');
        const csn = await cds.load('srv');

        const serviceDef = csn.definitions['CatalogService'];
        console.log('CatalogService found:', !!serviceDef);

        if (serviceDef) {
            console.log('Actions in CatalogService:', Object.keys(serviceDef.actions || {}).join(', '));
            // Check if sendTestNotification is in actions or as a separate definition?
            // Unbound actions are usually definitions in the CSN, not inside 'actions' property of AccessControl?
            // Let's check definitions starting with 'CatalogService.'
            const actions = Object.keys(csn.definitions).filter(d => d.startsWith('CatalogService.'));
            console.log('CatalogService definitions:', actions);
        }

        console.log('Starting temporary server on port 4005...');
        // Mock server
        const { app } = await cds.serve('all').from(csn).in(__dirname).with('srv/cat-service.js');
        const server = http.createServer(app).listen(4005, () => {
            console.log('Server listening on 4005');

            // Try to call it
            const req = http.request({
                hostname: 'localhost',
                port: 4005,
                path: '/odata/v4/catalog/sendTestNotification',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (res) => {
                console.log(`Response Status: ${res.statusCode}`);
                res.on('data', d => console.log('Body:', d.toString()));
                server.close();
                process.exit(0);
            });

            req.on('error', e => {
                console.error('Request error:', e);
                server.close();
                process.exit(1);
            });

            req.write(JSON.stringify({ userId: '33333333-3333-3333-3333-333333333333' }));
            req.end();
        });

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
