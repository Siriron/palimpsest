import { useNavigate, useSearchParams } from 'react-router-dom'
import { NoticeForm } from '../components/forms'
import { Gate } from '../components/ui'
import type { Scope } from '../lib/types'

export default function FileNotice() {
  const nav = useNavigate()
  const [q] = useSearchParams()
  return (
    <div className="wrap page stack" style={{ maxWidth: 780 }}>
      <div><span className="eyebrow">New statement</span><h2 style={{ marginTop: 8 }}>File an edit notice</h2></div>
      <p className="dim">Say what a commit range did to a document and which files you are speaking for. The statement is locked the moment it is filed, before anyone can audit or object.</p>
      <Gate>
        <div className="card">
          <NoticeForm
            initial={{ repo: q.get('repo') ?? '', base: q.get('base') ?? '', head: q.get('head') ?? '', scope: (q.get('scope') as Scope) || undefined, summary: q.get('summary') ?? '', covered: q.get('covered')?.split(',').filter(Boolean) ?? [] }}
            onDone={(row) => nav(row ? `/notices/${row.notice_id}` : '/notices')}
          />
        </div>
      </Gate>
    </div>
  )
}
