// External dependencies
const sendgridMail = require('@sendgrid/mail'),
  showdown  = require('showdown'),
  fs = require('fs'),
  request = require("request")

// E-mail string templates
const SUBJECT_TEMPLATE = "[ANN] $REPO$ $VERSION$ [$NAME$] released!",
  FOOTER_TEMPLATE = "\n\nRegards,\n\nThe $OWNER_NAME$ team.",
  HEADER_TEMPLATE = "[$REPO$]($REPO_URL$). $REPO_DESCRIPTION$ reached it's [$VERSION$]($RELEASEURL$) version."

let setCredentials = function(){
  sendgridMail.setApiKey(process.env.SENDGRID_API_TOKEN)
}

let prepareMessage = function(recipients) {

  let eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
    converter = new showdown.Converter(),
    repoName = eventPayload.repository.name,
    repoURL = eventPayload.repository.html_url,
    repoDescription = eventPayload.repository.description,
    releaseVersion = eventPayload.release.tag_name,
    releaseName = eventPayload.release.name,
    releaseURL = eventPayload.release.html_url,
    //I will get later the owner name using the GitHub API
    ownerName = "Buenos Aires Smalltalk",

    // This is not efficient but I find it quite readable
    emailSubject = SUBJECT_TEMPLATE
      .replace("$REPO$", repoName)
      .replace("$VERSION$", releaseVersion)
      .replace("$NAME$", releaseName),

    footer = FOOTER_TEMPLATE
      .replace("$OWNER_NAME$", ownerName),

    header = HEADER_TEMPLATE
    .replace("$REPO$", repoName)
    .replace("$VERSION$", releaseVersion)
    .replace("$REPO_URL$", repoURL)
    .replace("$REPO_DESCRIPTION$", repoDescription)
    .replace("$RELEASEURL$", releaseURL),

    releaseBody = converter.makeHtml(header + eventPayload.release.body + footer)

  let message = {
    from: {
      name: ownerName,
      email: 'notifications@github.com'
    },
    bcc: recipients,
    subject: emailSubject,
    html: releaseBody
  };

  return message
}

sendEmails = function (message) {

  sendgridMail
    .send(message)
    .then(() => {
      console.log("Mail sent!")
    })
    .catch(error => {

      //Log friendly error
      console.error(error.toString())

      //Extract error message
      const {message, code, response} = error

      //Extract response message
      const {headers, body} = response
    });
}



let getRecipients = function(recipients_url, callback) {

  request.get(recipients_url, (error, response, body) => {
    if (error) {
      console.error(error)
      process.exit(1);
    }

    callback(body.split(/\r\n|\n|\r/))

  });

}

setCredentials()
getRecipients(process.env.RECIPIENTS, function(recipients) {
  sendEmails(prepareMessage(recipients))
})
