const functions = require('firebase-functions'),
    admin = require('firebase-admin');

admin.initializeApp();

/*
The functions below do not check for human errors or if the user is authenticated
and has sufficient rights
The methods should automatically detect the issuing user whenever possible
In the first phase, all data is entered manually and unencrypted
(besides Google's TLS encryption)
*/
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.authenticate = functions.region('europe-west1').https.onCall(async (data, context) => {
    const db = admin.firestore();
    const query = db.collection('users').where('username', '==', data.username)
        .where('p1', '==', data.password);
    const snapshot = await query.get();

    console.log('Snapshot size: ', snapshot.size);
    if (snapshot.size !== 1) {
        return null;
    }
    let user;
    snapshot.forEach(result => user = result);
    
    return admin.auth().createCustomToken(user.id);
});

exports.echo = functions.region('europe-west1').https.onCall((data, context) => {
    return data;
});

exports.getUsers = functions.region('europe-west1').https.onCall(async (data, context) => {
    const users = await admin.firestore().collection('users').get();
    const result = [];
    users.forEach(user => {
        const data = user.data();
        result.push({nickname: data.nickname, username: data.username})
    });

    return result;
});

exports.updateInstanceToken = functions.region('europe-west1').https.onCall(async (data, context) => {
    // check if the document already exists
    const docRefs = await admin.firestore().collection('instance_tokens')
        .where('username', '==', data.username).get();

    // check for multiple instances (throw Exception)
    if (docRefs.size > 1) {
        return undefined;
    }

    if (docRefs.size === 1) {
        let doc;
        docRefs.forEach(dd => doc = dd.ref);
        doc.set({token: data.token}, {merge: true});
        return doc.update();
    }

    await admin.firestore().collection('instance_tokens')
        .add({username: data.username, token: data.token});
    return undefined;
});
