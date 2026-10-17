export function createProfileAccessModel (account = {}, profile = {}) {
  const signedIn = account.status === 'signed-in'
  const nickname = String(profile.nickname ?? '').trim() || 'Guest'

  return {
    name: signedIn ? nickname : 'Guest',
    status: signedIn ? 'Mi perfil' : 'Iniciar sesión',
    title: signedIn
      ? `Abrir el perfil de ${nickname}`
      : 'Iniciar sesión con Google para personalizar tu perfil',
    signedIn
  }
}
