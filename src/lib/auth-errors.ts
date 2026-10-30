// Translate only known Auth failures. A generic 500 does not prove an SMTP issue.
// Never expose provider responses, credentials or tokens in the interface.
export function authErrorMessage(error: unknown): string | null {
  const e = error as { code?: string; message?: string } | null;
  const messages: Record<string, string> = {
    email_address_invalid: 'Confira o endereço de e-mail e tente novamente.',
    email_address_not_authorized: 'O envio de e-mail ainda não está disponível para este endereço.',
    over_email_send_rate_limit:
      'O limite de envio de códigos foi atingido. Aguarde e tente novamente.',
    signup_disabled: 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.',
    email_provider_disabled: 'O acesso por e-mail está temporariamente indisponível.',
  };
  if (e?.code && Object.hasOwn(messages, e.code)) return messages[e.code] ?? null;
  if (
    typeof e?.message === 'string' &&
    /error sending (?:confirmation|magic link|recovery|invite|reauthentication|email change) (?:email|mail)/i.test(
      e.message,
    )
  )
    return 'Não conseguimos enviar o código por e-mail. Aguarde alguns minutos e tente novamente.';
  return null;
}
