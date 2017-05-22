var mandrill = require('mandrill-api/mandrill');

var mandrill_client = new mandrill.Mandrill('Dl19Kw_6BEVJwz1_nKwjmg');
var template_name = "your_template";
var template_content = [];
var message = {
  "html": "<p>Example HTML content</p>",
  "subject": "Email Subject",
  "from_email": "referralrace@algorithmous.com",
  "from_name": "Referral Race",
  "to": [{
    "email": "smkamranqadri@yahoo.com",
    "type": "to"
  }]
};
var async = true;
var ip_pool = undefined;
var send_at = new Date();
console.log('About to send email to: smkamranqadri@yahoo.com');
// mandrill_client.messages.sendTemplate({ "template_name": template_name, "template_content": template_content, "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at }, function (result) {
mandrill_client.messages.send({ "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at }, function (result) {
  console.log(result);
  // response.status(200).json(result);
}, function (e) {
  // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
  console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
  // Mandrill returns the error as an object with name and message keys
  // response.status(500).end("Internal Error: " + JSON.stringify(e))
});