var functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.sendFriendRequestNotification = functions.database.ref('/requests/{senderUid}/requestsSent/{index}').onWrite(event => {
  const senderUid = event.params.senderUid;
  const receiverUid = event.data.val();
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('User ', senderUid, 'unfriend user', receiverUid);
  }
  console.log('We have a new receiverUid:', receiverUid, 'for senderUid:', senderUid, 'at index:', event.params.index);

  // Get the list of device notification tokens.
  const getDeviceTokensPromise = admin.database().ref(`/accounts/${receiverUid}/registrationId`).once('value');

  // Get the follower profile.
  const getSenderProfilePromise = admin.auth().getUser(senderUid);

  return Promise.all([getDeviceTokensPromise, getSenderProfilePromise]).then(results => {
    const tokensSnapshot = results[0];
    const sender = results[1];
    console.log('token', tokensSnapshot.val())
    // Check if there are any device tokens.
    if (!tokensSnapshot.val()) {
      return console.log('There is no registrationId to send to.');
    }
    console.log('This is the (', tokensSnapshot.val(), ') registrationId to send notifications to.');
    console.log('Fetched sender profile', sender);

    // Notification details.
    const payload = {
      notification: {
        title: 'You have a new friend Request!',
        body: `${sender.displayName} is sent friend request to you.`,
        icon: sender.photoURL
      }
    };

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot.val(), payload).then(response => {
      const error = response.result.error;
      if (error) {
        console.error('Failure sending notification to', tokensSnapshot.val(), error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokensSnapshot.val()).remove());
        }
      }
      return Promise.all(tokensToRemove);
    });
  });
});

exports.sendAcceptFriendRequestNotification = functions.database.ref('/accounts/{userUid}/friends/{index}').onWrite(event => {
  const userUid = event.params.userUid;
  const friendUid = event.data.val();
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('User ', userUid, 'unfriend user', friendUid);
  }
  console.log('We have a new userUid:', userUid, 'for friendUid:', friendUid, 'at index:', event.params.index);

  // Get the list of device notification tokens.
  const getDeviceTokensPromise = admin.database().ref(`/accounts/${friendUid}/registrationId`).once('value');

  // Get the follower profile.
  const getSenderProfilePromise = admin.auth().getUser(userUid);

  return Promise.all([getDeviceTokensPromise, getSenderProfilePromise]).then(results => {
    const tokensSnapshot = results[0];
    const sender = results[1];
    console.log('token', tokensSnapshot.val())
    // Check if there are any device tokens.
    if (!tokensSnapshot.val()) {
      return console.log('There is no registrationId to send to.');
    }
    console.log('This is the (', tokensSnapshot.val(), ') registrationId to send notifications to.');
    console.log('Fetched sender profile', sender);

    // Notification details.
    const payload = {
      notification: {
        title: 'New Friend!',
        body: `${sender.displayName} and you are now friends.`,
        icon: sender.photoURL
      }
    };

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot.val(), payload).then(response => {
      console.log(response)
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', tokensSnapshot.val(), error);
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokensSnapshot.ref.child(tokensSnapshot.val()).remove());
          }
        }
      });
      userPoints = admin.database().ref(`/accounts/${userUid}/points`).once('value').then(snap => {
        return admin.database().ref(`/accounts/${userUid}/points`).set(snap.val() + 1);
      });
      friendPoints = admin.database().ref(`/accounts/${friendUid}/points`).once('value').then(snap => {
        return admin.database().ref(`/accounts/${friendUid}/points`).set(snap.val() + 1);
      });
      referralCheck = admin.database().ref(`referral/${friendUid}/${userUid}`).once('value').then(snap => {
        console.log('key', snap.key)
        console.log('val', snap.val())
        if (!snap.key) return;
        refferedUid = snap.val().referredBy;
        console.log('refferedUid', refferedUid);
        refferedPoints = admin.database().ref(`/accounts/${refferedUid}/points`).once('value').then(snap => {
          console.log('referral point', snap.val())
          return admin.database().ref(`/accounts/${refferedUid}/points`).set(snap.val() + 1);
        });
        let obj = snap.val();
        obj.referralAcceptedOn = new Date().toString();
        console.log('obj', obj);
        referralAccepted = admin.database().ref(`referral/${friendUid}/${userUid}`).set(obj);
        return Promise.all(refferedPoints, referralAccepted);
      }).catch(err => { 
        console.log('err', err);
      });
      return Promise.all(userPoints, friendPoints, referralCheck, tokensToRemove);
    });
  });
});

exports.sendNewMessageNotification = functions.database.ref('/conversations/{conversationID}/messages/{index}').onWrite(event => {
  const senderUid = event.data.val().sender;
  const receiverUid = event.data.val().receiver;
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('User ', senderUid, 'message removed of user', receiverUid);
  }
  console.log('We have a new receiverUid:', receiverUid, 'for senderUid:', senderUid, 'at index:', event.params.index);

  // Get the list of device notification tokens.
  const getDeviceTokensPromise = admin.database().ref(`/accounts/${receiverUid}/registrationId`).once('value');

  // Get the follower profile.
  const getSenderProfilePromise = admin.auth().getUser(senderUid);

  return Promise.all([getDeviceTokensPromise, getSenderProfilePromise]).then(results => {
    const tokensSnapshot = results[0];
    const sender = results[1];
    console.log('token', tokensSnapshot.val())
    // Check if there are any device tokens.
    if (!tokensSnapshot.val()) {
      return console.log('There is no registrationId to send to.');
    }
    console.log('This is the (', tokensSnapshot.val(), ') registrationId to send notifications to.');
    console.log('Fetched sender profile', sender);

    // Notification details.
    const payload = {
      notification: {
        title: 'You have a new Message!',
        body: `${sender.displayName} is sent you message.`,
        icon: sender.photoURL
      }
    };

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot.val(), payload).then(response => {
      const error = response.result.error;
      if (error) {
        console.error('Failure sending notification to', tokensSnapshot.val(), error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokensSnapshot.val()).remove());
        }
      }
      return Promise.all(tokensToRemove);
    });
  });
});

exports.sendNewGroupMessageNotification = functions.database.ref('/groups/{groupId}/messages/{index}').onWrite(event => {
  const senderUid = event.data.val().sender;
  const groupId = event.data.val().groupId;
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('User ', senderUid, 'message removed of groupId', groupId);
  }
  console.log('We have a new groupId:', groupId, 'for senderUid:', senderUid, 'at index:', event.params.index);

  // Get the follower profile.
  const getSenderProfilePromise = admin.auth().getUser(senderUid);

  const getGroup = admin.database().ref(`/groups/${groupId}`).once('value');

  return Promise.all([getSenderProfilePromise, getGroup]).then(results => {
    const sender = results[0];
    const group = results[1].val();
    console.log('group', group);

    getTokens = [];

    group.members.forEach(member => {
      console.log('member', member);
      if (senderUid !== member) getTokens.push(admin.database().ref(`/accounts/${member}/registrationId`).once('value'))
    })

    return Promise.all(getTokens).then(results => {
      results.forEach(tokenSnap => {
        const token = tokenSnap.val();
        // Check if there are any device tokens.
        if (!token) {
          return console.log('There is no registrationId to send to.');
        }
        console.log('This is the (', token, ') registrationId to send notifications to.');
        console.log('Fetched sender profile', sender);

        // Notification details.
        const payload = {
          notification: {
            title: 'You have a new Message!',
            body: `${sender.displayName} is sent message in ${group.name}.`,
            icon: sender.photoURL
          }
        };

        // Send notifications to all tokens.
        return admin.messaging().sendToDevice(token, payload).then(response => {
          const error = response.result.error;
          if (error) {
            console.error('Failure sending notification to', token, error);
          }
        });
      })
    });
  });
});