import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function EnquetesPage() {
  await createClient() // Ensures auth check via middleware

  const { data: enquetes } = await supabaseAdmin
    .from('enquetes')
    .select('*, enquete_votos(count), enquete_tokens(count)')
    .order('criado_em', { ascending: false })

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-800 text-2xl font-bold">Enquetes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{enquetes?.length ?? 0} enquete{enquetes?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/enquetes/nova"
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2.5} strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Nova Enquete
        </Link>
      </div>

      {!enquetes?.length ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhuma enquete criada.</p>
          <Link href="/enquetes/nova" className="mt-4 text-green-600 hover:text-green-700 text-sm block">
            Criar primeira enquete
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enquetes.map(e => {
            const totalVotos = (e.enquete_votos as { count: number }[])?.[0]?.count ?? 0
            const totalInscritos = (e.enquete_tokens as { count: number }[])?.[0]?.count ?? 0
            return (
              <Link
                key={e.id}
                href={`/enquetes/${e.id}`}
                className="block bg-white border border-[#e0e0e0] rounded-xl p-4 hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-800 truncate">{e.titulo}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${e.ativa ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {e.ativa ? 'Aberta' : 'Encerrada'}
                      </span>
                    </div>
                    {e.descricao && <p className="text-gray-500 text-sm mt-1 line-clamp-1">{e.descricao}</p>}
                    <p className="text-gray-400 text-xs mt-2">
                      {format(parseISO(e.criado_em), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-green-600 font-semibold">{totalVotos} / {totalInscritos}</p>
                    <p className="text-gray-400 text-xs">votos</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
