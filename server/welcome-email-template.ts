/** Keep queued payloads stable for provider retries, and the current previews in docs/news in sync. */
export const WELCOME_EMAIL_VERSION = 'modwerk-welcome-003'
const firstWelcomeEmail = {
  subject: 'Hello from Modwerk',
  html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hello from Modwerk</title>
</head>
<body style="margin:0;padding:0;background-color:#171719;color:#ededf2;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">More modules are coming, and the repo is open for contributions.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171719">
  <tr><td align="center" style="padding:32px 16px;">
    <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 8px 24px;font-size:26px;font-weight:bold;letter-spacing:-1px;color:#ffffff;">Modwerk<span style="color:#c7a16c;"> ▪</span></td></tr>
      <tr><td bgcolor="#c7a16c" height="3" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
      <tr><td bgcolor="#232327" style="padding:32px 28px;border:1px solid #36363e;border-top:0;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;color:#c7a16c;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;">A note from Jannik · Welcome</p>
        <h1 style="margin:0 0 22px;color:#f4f4f8;font-size:28px;line-height:36px;font-weight:bold;letter-spacing:-0.5px;">Thanks for joining Modwerk.</h1>
        <p style="margin:0 0 16px;color:#c4c4ce;font-size:15px;line-height:25px;">Hi,</p>
        <p style="margin:0 0 18px;color:#c4c4ce;font-size:15px;line-height:25px;">Thanks for signing up. Modwerk is still getting started, and it’s good to have you here.</p>
        <p style="margin:0 0 18px;color:#c4c4ce;font-size:15px;line-height:25px;">Lots of modules are already on their way to being integrated. I’ll keep you posted as they’re added.</p>
        <p style="margin:0 0 24px;color:#c4c4ce;font-size:15px;line-height:25px;">If you’re a developer, <strong style="color:#f4f4f8;">fork the repo and start adding your own modules.</strong></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:4px 0 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="#727dde" style="border-radius:7px;text-align:center;">
                <a href="https://github.com/repeat98/modwerk" style="display:inline-block;padding:15px 22px;border:1px solid #727dde;border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;">Fork the repo</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:0 0 26px;color:#a8a8b8;font-size:12px;line-height:20px;">The SDK and contribution guide are in the repo.</td></tr>
        </table>
        <p style="margin:0 0 18px;color:#c4c4ce;font-size:15px;line-height:25px;">We need your help spreading the word to get the ball rolling. If you know someone who’d be into <a href="https://modwerk.app/" style="color:#c4c9ff;text-decoration:underline;">Modwerk</a>, please send them the link.</p>
        <p style="margin:0;color:#f4f4f8;font-size:15px;line-height:25px;">See you around,<br><strong>Jannik</strong></p>
      </td></tr>
      <tr><td style="padding:24px 8px 8px;color:#90909e;font-size:12px;line-height:21px;">
        <p style="margin:0 0 8px;">You’re receiving this welcome email because you joined Modwerk. You can manage future news emails in your <a href="https://modwerk.app/#account" style="color:#b9bdd7;text-decoration:underline;">account settings</a>.</p>
        <p style="margin:0;">Modwerk · <a href="https://modwerk.app/" style="color:#b9bdd7;text-decoration:underline;">modwerk.app</a></p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>
`,
  text: `A note from Jannik · Welcome

Thanks for joining Modwerk.

Hi,

Thanks for signing up. Modwerk is still getting started, and it’s good to have you here.

Lots of modules are already on their way to being integrated. I’ll keep you posted as they’re added.

If you’re a developer, fork the repo and start adding your own modules.

Fork the repo:
https://github.com/repeat98/modwerk

The SDK and contribution guide are in the repo.

We need your help spreading the word to get the ball rolling. If you know someone who’d be into Modwerk (https://modwerk.app/), please send them the link.

See you around,
Jannik

You’re receiving this welcome email because you joined Modwerk. You can manage future news emails in your account settings:
https://modwerk.app/#account

Modwerk · https://modwerk.app/
`,
}

const discordHtml = `        <p style="margin:0 0 16px;color:#c4c4ce;font-size:15px;line-height:25px;">Come say hi on Discord and share what you’re working on.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:4px 0 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="#303036" style="border-radius:7px;text-align:center;">
                <a href="https://discord.gg/QQxFb85m7" style="display:inline-block;padding:15px 22px;border:1px solid #555561;border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;">Join us on Discord</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
`
const discordText = `Come say hi on Discord and share what you’re working on.

Join us on Discord:
https://discord.gg/QQxFb85m7

`
const signatureHtml = '        <p style="margin:0;color:#f4f4f8;font-size:15px;line-height:25px;">See you around,'
/** 5 October 2026: the first welcome plus the Discord invitation. Queued rows may still retry it; never change it. */
const discordWelcomeEmail = {
  ...firstWelcomeEmail,
  html: firstWelcomeEmail.html.replace(signatureHtml, discordHtml + signatureHtml),
  text: firstWelcomeEmail.text.replace('See you around,\nJannik', discordText + 'See you around,\nJannik'),
}
const paragraph = 'style="margin:0 0 18px;color:#c4c4ce;font-size:15px;line-height:25px;"'
const link = 'style="color:#c4c9ff;text-decoration:underline;"'
function button(href: string, label: string, primary: boolean) {
  const fill = primary ? '#727dde' : '#303036', border = primary ? '#727dde' : '#555561'
  return `        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:4px 0 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="${fill}" style="border-radius:7px;text-align:center;">
                <a href="${href}" style="display:inline-block;padding:15px 22px;border:1px solid ${border};border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;">${label}</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
`
}
/** 7 October 2026: the welcome leads into the forum. Introductions, the member's machine and module threads come before the repo. */
const forumWelcomeEmail = {
  subject: 'Hello from Modwerk',
  html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hello from Modwerk</title>
</head>
<body style="margin:0;padding:0;background-color:#171719;color:#ededf2;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Say hello in the forum and follow the modules for your machine.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171719">
  <tr><td align="center" style="padding:32px 16px;">
    <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 8px 24px;font-size:26px;font-weight:bold;letter-spacing:-1px;color:#ffffff;">Modwerk<span style="color:#c7a16c;"> ▪</span></td></tr>
      <tr><td bgcolor="#c7a16c" height="3" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
      <tr><td bgcolor="#232327" style="padding:32px 28px;border:1px solid #36363e;border-top:0;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;color:#c7a16c;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;">A note from Jannik · Welcome</p>
        <h1 style="margin:0 0 22px;color:#f4f4f8;font-size:28px;line-height:36px;font-weight:bold;letter-spacing:-0.5px;">Thanks for joining Modwerk.</h1>
        <p style="margin:0 0 16px;color:#c4c4ce;font-size:15px;line-height:25px;">Hi,</p>
        <p ${paragraph}>Thanks for signing up. Modwerk is still getting started, and it’s good to have you here.</p>
        <p ${paragraph}>The forum is where it all happens. Come and <strong style="color:#f4f4f8;">say hello in Introductions</strong>, and tell us which machines you play and what you’re making with them.</p>
${button('https://modwerk.app/#forum?category=introductions', 'Say hello', true)}        <p ${paragraph}>Every Elektron box has its own corner of the forum, with the modules made for it and the people using them. <a href="https://modwerk.app/#forum" ${link}>Browse the forum for your machine</a>.</p>
        <p ${paragraph}>Each module has a thread of its own. Follow it and you’ll hear about new releases and replies in the bell on the site, as an email digest, and optionally as push on your phone. You choose all of that in your <a href="https://modwerk.app/#account/notifications" ${link}>account settings</a>.</p>
        <p style="margin:0 0 24px;color:#c4c4ce;font-size:15px;line-height:25px;">If you’re a developer, <strong style="color:#f4f4f8;">fork the repo and start adding your own modules.</strong></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:4px 0 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="#727dde" style="border-radius:7px;text-align:center;">
                <a href="https://github.com/repeat98/modwerk" style="display:inline-block;padding:15px 22px;border:1px solid #727dde;border-radius:7px;color:#ffffff;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;">Fork the repo</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:0 0 26px;color:#a8a8b8;font-size:12px;line-height:20px;">The SDK and contribution guide are in the repo.</td></tr>
        </table>
        <p ${paragraph}>We need your help spreading the word to get the ball rolling. If you know someone who’d be into <a href="https://modwerk.app/" ${link}>Modwerk</a>, please send them the link.</p>
        <p style="margin:0 0 16px;color:#c4c4ce;font-size:15px;line-height:25px;">There’s a Discord too, if chat is more your thing.</p>
${button('https://discord.gg/QQxFb85m7', 'Join us on Discord', false)}        <p style="margin:0;color:#f4f4f8;font-size:15px;line-height:25px;">See you around,<br><strong>Jannik</strong></p>
      </td></tr>
      <tr><td style="padding:24px 8px 8px;color:#90909e;font-size:12px;line-height:21px;">
        <p style="margin:0 0 8px;">You’re receiving this welcome email because you joined Modwerk. You can manage future news emails in your <a href="https://modwerk.app/#account" style="color:#b9bdd7;text-decoration:underline;">account settings</a>.</p>
        <p style="margin:0;">Modwerk · <a href="https://modwerk.app/" style="color:#b9bdd7;text-decoration:underline;">modwerk.app</a></p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>
`,
  text: `A note from Jannik · Welcome

Thanks for joining Modwerk.

Hi,

Thanks for signing up. Modwerk is still getting started, and it’s good to have you here.

The forum is where it all happens. Come and say hello in Introductions, and tell us which machines you play and what you’re making with them.

Say hello:
https://modwerk.app/#forum?category=introductions

Every Elektron box has its own corner of the forum, with the modules made for it and the people using them. Browse the forum for your machine:
https://modwerk.app/#forum

Each module has a thread of its own. Follow it and you’ll hear about new releases and replies in the bell on the site, as an email digest, and optionally as push on your phone. You choose all of that in your account settings:
https://modwerk.app/#account/notifications

If you’re a developer, fork the repo and start adding your own modules.

Fork the repo:
https://github.com/repeat98/modwerk

The SDK and contribution guide are in the repo.

We need your help spreading the word to get the ball rolling. If you know someone who’d be into Modwerk (https://modwerk.app/), please send them the link.

There’s a Discord too, if chat is more your thing.

Join us on Discord:
https://discord.gg/QQxFb85m7

See you around,
Jannik

You’re receiving this welcome email because you joined Modwerk. You can manage future news emails in your account settings:
https://modwerk.app/#account

Modwerk · https://modwerk.app/
`,
}
export const welcomeEmail = forumWelcomeEmail
export const welcomeEmailVersions: Readonly<Record<string, typeof welcomeEmail>> = {
  'modwerk-welcome-001': firstWelcomeEmail,
  'modwerk-welcome-002': discordWelcomeEmail,
  [WELCOME_EMAIL_VERSION]: welcomeEmail,
}
