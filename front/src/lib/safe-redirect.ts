/**
 * Adresse de retour après la connexion (`?redirect=`), limitée aux chemins de
 * Luniqo. Une adresse fournie dans l'URL ne doit jamais renvoyer vers un autre
 * site (redirection ouverte, OWASP) : `//exemple.com` et `/\exemple.com` sont
 * lus par le navigateur comme des adresses d'un autre domaine.
 */
export function safeRedirect(target: unknown, fallback = '/accueil'): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.includes('\\')) return fallback
  // Caractères de contrôle : les navigateurs en retirent certains d'une URL (« /\t/exemple.com »).
  if (/\p{Cc}/u.test(target)) return fallback
  return target
}
