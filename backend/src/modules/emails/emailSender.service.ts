import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env.js";

let transporter: Transporter | null = null;

export async function getTransporter(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
    });
  } else {
    // Automatically generate an Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Ethereal] Created test account: ${testAccount.user}`);
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

export interface SendMailOptions {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmailViaEthereal(options: SendMailOptions) {
  const mailTransporter = await getTransporter();

  const mailOptions = {
    from: `"${options.fromName}" <${options.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: sans-serif; line-height: 1.6;">${options.body.replace(/\n/g, "<br/>")}</div>`,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

  console.log(`[Ethereal] Message sent: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[Ethereal] Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}

