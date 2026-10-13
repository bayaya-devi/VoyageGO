const copy = {
  fr: { verify: 'Confirmez votre adresse e-mail — VoyageGo', reset: 'Réinitialisez votre mot de passe VoyageGo', introVerify: 'Confirmez votre adresse pour activer votre compte VoyageGo.', introReset: 'Une demande de réinitialisation a été effectuée pour votre compte VoyageGo.', actionVerify: 'Confirmer mon adresse', actionReset: 'Choisir un nouveau mot de passe', ignore: 'Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.', expiry: 'Ce lien est à usage unique et expire dans une heure.', signoff: 'L’équipe VoyageGo' },
  en: { verify: 'Confirm your email address — VoyageGo', reset: 'Reset your VoyageGo password', introVerify: 'Confirm your address to activate your VoyageGo account.', introReset: 'A password reset was requested for your VoyageGo account.', actionVerify: 'Confirm my email', actionReset: 'Choose a new password', ignore: 'If you did not request this, you can ignore this message.', expiry: 'This one-time link expires in one hour.', signoff: 'The VoyageGo team' },
  ar: { verify: 'أكد بريدك الإلكتروني — VoyageGo', reset: 'إعادة تعيين كلمة مرور VoyageGo', introVerify: 'أكد عنوانك لتفعيل حساب VoyageGo.', introReset: 'تم طلب إعادة تعيين كلمة المرور لحساب VoyageGo.', actionVerify: 'تأكيد البريد الإلكتروني', actionReset: 'اختيار كلمة مرور جديدة', ignore: 'إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.', expiry: 'هذا الرابط صالح للاستخدام مرة واحدة وينتهي خلال ساعة.', signoff: 'فريق VoyageGo' },
  es: { verify: 'Confirma tu correo electrónico — VoyageGo', reset: 'Restablece tu contraseña de VoyageGo', introVerify: 'Confirma tu dirección para activar tu cuenta VoyageGo.', introReset: 'Se solicitó restablecer la contraseña de tu cuenta VoyageGo.', actionVerify: 'Confirmar mi correo', actionReset: 'Elegir una contraseña nueva', ignore: 'Si no lo has solicitado, puedes ignorar este mensaje.', expiry: 'Este enlace de un solo uso caduca en una hora.', signoff: 'El equipo de VoyageGo' },
  pt: { verify: 'Confirma o teu endereço de e-mail — VoyageGo', reset: 'Redefine a tua palavra-passe VoyageGo', introVerify: 'Confirma o teu endereço para ativar a tua conta VoyageGo.', introReset: 'Foi pedida a redefinição da palavra-passe da tua conta VoyageGo.', actionVerify: 'Confirmar o meu e-mail', actionReset: 'Escolher uma nova palavra-passe', ignore: 'Se não fizeste este pedido, podes ignorar esta mensagem.', expiry: 'Esta ligação de utilização única expira dentro de uma hora.', signoff: 'A equipa VoyageGo' },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export async function sendAuthEmail(env, { to, url, locale = 'fr', type }) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.BREVO_SENDER_NAME) {
    throw new Error('TRANSACTIONAL_EMAIL_NOT_CONFIGURED');
  }
  const lang = copy[locale] ? locale : 'fr';
  const words = copy[lang];
  const verification = type === 'verify';
  const subject = verification ? words.verify : words.reset;
  const intro = verification ? words.introVerify : words.introReset;
  const action = verification ? words.actionVerify : words.actionReset;
  const safeUrl = escapeHtml(url);
  const htmlContent = `<!doctype html><html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}><body style="margin:0;background:#f2f5f2;color:#183a35;font-family:Arial,sans-serif"><main style="max-width:560px;margin:32px auto;padding:36px 28px;background:#fff;border-radius:20px"><p style="color:#2f7768;font-weight:700">VoyageGo</p><h1 style="font-size:24px">${escapeHtml(subject)}</h1><p>${escapeHtml(intro)}</p><p style="margin:30px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#2f7768;color:#fff;text-decoration:none;border-radius:24px">${escapeHtml(action)}</a></p><p>${escapeHtml(words.expiry)}</p><p>${escapeHtml(words.ignore)}</p><p>${escapeHtml(words.signoff)}</p></main></body></html>`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: to }], subject, htmlContent,
      textContent: `${intro}\n\n${action}: ${url}\n\n${words.expiry} ${words.ignore}\n${words.signoff}`,
    }),
  });
  if (!response.ok) throw new Error(`BREVO_SEND_FAILED_${response.status}`);
}
