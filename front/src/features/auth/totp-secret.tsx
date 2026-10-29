/** Secret TOTP à saisir à la main, par groupes de 4 caractères pour la lisibilité. */
export function TotpSecret({ secret, uri }: { secret: string; uri: string }) {
  const groups = secret.match(/.{1,4}/g) ?? [secret]
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Dans votre application d&apos;authentification, ajoutez un compte avec cette clé :
      </p>
      <p aria-label="Clé secrète" className="rounded-md bg-muted p-4 text-center font-mono text-lg tracking-wider">
        {groups.join(' ')}
      </p>
      <p className="text-sm">
        Sur ce téléphone ?{' '}
        <a href={uri} className="text-primary underline underline-offset-4">
          Ouvrir dans l&apos;application d&apos;authentification
        </a>
      </p>
    </div>
  )
}
