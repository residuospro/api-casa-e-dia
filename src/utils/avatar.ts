export function generateAvatar(nome: string, genero?: string | null): string {
  const style = genero === 'FEMININO' ? 'avataaars' : 'lorelei';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(nome)}`;
}
