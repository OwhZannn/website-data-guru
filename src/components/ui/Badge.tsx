/** Badge status — pembungkus tipis untuk kelas `.label` yang sudah ada. Server component. */
export default function Badge(p: { status: string; children: React.ReactNode }) {
  return <span className={`label ${p.status}`}>{p.children}</span>
}
