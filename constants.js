//constants to be used in entire app. i.e. string defintions which need to
//remain consistent across files yet subject to change

const SITE_NAME = "Nodeocrat";

module.exports = {
  SITE_NAME: SITE_NAME,
  account: {
    INCORRECT_PASSWORD: "Incorrect password",
    INVALID_EMAIL: "Invalid email address",
    PASSWORD_UPDATE: "Password has been updated",
    EMAIL_UPDATE: "Email has been updated",
    USERNAME_UPDATE: "Username has been updated",
    DUPLICATE_USERNAME: "That username is already taken",
    DUPLICATE_EMAIL: "That email address has already been registered"
  },
  registration: {
    PASSWORD_OR_SOCIAL_REQUIRED: "Either a password or social networking account is required for login",
    USERNAME_REQUIRED: "Username is required",
    EMAIL_REQUIRED: "An email address is required",
    DUPLICATE_SOCIAL_ACCOUNT: (site)=>{return "That " + site + " account is already linked to a " + SITE_NAME + " account";},
    RECAPTCHA_ERROR: "There is a problem with verifying the Recaptcha challenge. Please make sure it has been completed correctly."
  }
};
