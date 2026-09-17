'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCepData, geocodeFullAddress } from "@/lib/geocoding";
import { Concessionaria, Contato, Categoria, CATEGORIAS, StatusTipo } from "@/types";
import { Lock, Search, Plus, Edit2, Trash2, ArrowLeft, Loader2, Save, X, Trash, Settings, MapPin } from "lucide-react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

export default function AdminClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    });
    setLoggingIn(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 text-center text-sm mb-6">Entre com sua conta de administrador para acessar o painel de concessionárias.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-50"
                autoFocus
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Senha"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-slate-50"
                required
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
            >
              {loggingIn ? 'Entrando...' : 'Entrar'}
            </button>
            <Link
              href="/"
              className="w-full bg-white hover:bg-slate-50 text-slate-600 font-semibold py-3 px-4 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> Voltar ao Mapa
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} userEmail={session.user.email || ''} />;
}

function AdminDashboard({ onLogout, userEmail }: { onLogout: () => void; userEmail: string }) {
  const [stores, setStores] = useState<Concessionaria[]>([]);
  const [statusTipos, setStatusTipos] = useState<StatusTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Concessionaria | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fetchStatusTipos = async () => {
    const { data, error } = await supabase.from('status_tipos').select('*').order('ordem', { ascending: true });
    if (error) console.error(error);
    if (data) setStatusTipos(data as StatusTipo[]);
  };

  const fetchStores = async () => {
    setLoading(true);
    setOperationError(null);
    const { data, error } = await supabase
      .from('concessionarias')
      .select('*, contatos(*)')
      .order('nome_loja', { ascending: true });

    if (error) {
      console.error(error);
      setOperationError("Erro ao buscar concessionárias: " + error.message);
    }

    if (data) setStores(data as Concessionaria[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
    fetchStatusTipos();
  }, []);

  const filteredStores = stores.filter(s =>
    (s.nome_loja || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.cidade || "").toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = async (id: string) => {
    setLoading(true);
    setItemToDelete(null);
    const { error } = await supabase.from('concessionarias').delete().eq('id', id);
    if (error) {
       setOperationError("Erro ao excluir: " + error.message);
    }
    await fetchStores();
  };

  const colorFor = (statusNome: string) => statusTipos.find(t => t.nome === statusNome)?.cor || '#64748B';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-xl font-black text-slate-800">Painel de Concessionárias</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar concessionárias..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 border rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <button
            onClick={() => setIsStatusManagerOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap text-sm h-10"
            title="Gerenciar Status"
          >
            <Settings size={16} /> <span className="hidden sm:inline">Status</span>
          </button>
          <button
            onClick={() => { setEditingStore(null); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap text-sm h-10"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Cadastrar Concessionária</span>
          </button>
          <div className="flex flex-col items-end ml-2">
            <span className="text-[11px] text-slate-400 font-medium hidden lg:block">{userEmail}</span>
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-red-500 text-sm font-semibold transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {operationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 rounded-r-lg max-w-7xl mx-auto w-full">
          <p className="text-red-700 text-sm font-bold">{operationError}</p>
        </div>
      )}

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {loading && stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Carregando banco de dados...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Nome da Loja</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Categorias</th>
                    <th className="px-6 py-4">Cidade/Estado</th>
                    <th className="px-6 py-4">Proprietário</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map(store => (
                    <tr key={store.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {store.nome_loja}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: `${colorFor(store.status)}1A`, color: colorFor(store.status) }}
                        >
                          {store.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(store.categorias || []).map(c => (
                            <span key={c} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-bold">
                              {CATEGORIAS.find(x => x.value === c)?.label || c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">{store.cidade} - {store.estado}</td>
                      <td className="px-6 py-4">{store.proprietario || '-'}</td>
                      <td className="px-6 py-4 text-right w-[120px]">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingStore(store); setIsFormOpen(true); }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent shadow hover:shadow-md bg-slate-50"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setItemToDelete(store.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-transparent shadow hover:shadow-md bg-slate-50"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                        Nenhuma concessionária encontrada na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {itemToDelete && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Concessionária?</h2>
            <p className="text-slate-600 mb-6 font-medium">Esta ação não pode ser desfeita. A concessionária e seus contatos serão permanentemente removidos do sistema.</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-2 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={() => confirmDelete(itemToDelete)} className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <StoreFormModal
          store={editingStore}
          statusTipos={statusTipos}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchStores();
          }}
        />
      )}

      {isStatusManagerOpen && (
        <StatusManagerModal
          statusTipos={statusTipos}
          onClose={() => setIsStatusManagerOpen(false)}
          onChange={fetchStatusTipos}
        />
      )}
    </div>
  );
}

function StatusManagerModal({ statusTipos, onClose, onChange }: { statusTipos: StatusTipo[]; onClose: () => void; onChange: () => void }) {
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('status_tipos').insert([{
      nome: novoNome.trim().toUpperCase(),
      cor: novaCor,
      ordem: statusTipos.length,
    }]);
    setSaving(false);
    if (error) {
      setError(error.message.includes('duplicate') ? 'Já existe um status com esse nome.' : error.message);
      return;
    }
    setNovoNome("");
    onChange();
  };

  const startEdit = (tipo: StatusTipo) => {
    setEditingId(tipo.id);
    setEditNome(tipo.nome);
    setEditCor(tipo.cor);
  };

  const saveEdit = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('status_tipos').update({ nome: editNome.trim().toUpperCase(), cor: editCor }).eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    onChange();
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('status_tipos').delete().eq('id', id);
    if (error) {
      setError('Não é possível excluir: existem concessionárias usando esse status.');
      return;
    }
    onChange();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-800">Gerenciar Status</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && <div className="mb-3 p-2.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200">{error}</div>}

        <div className="flex flex-col gap-2 mb-5 max-h-60 overflow-y-auto">
          {statusTipos.map(tipo => (
            <div key={tipo.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
              {editingId === tipo.id ? (
                <>
                  <input type="color" value={editCor} onChange={e => setEditCor(e.target.value)} className="w-8 h-8 rounded cursor-pointer flex-shrink-0" />
                  <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm" />
                  <button onClick={() => saveEdit(tipo.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tipo.cor }} />
                  <span className="flex-1 text-sm font-bold text-slate-700">{tipo.nome}</span>
                  <button onClick={() => startEdit(tipo)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(tipo.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
          {statusTipos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhum status cadastrado.</p>}
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <input type="color" value={novaCor} onChange={e => setNovaCor(e.target.value)} className="w-9 h-9 rounded cursor-pointer flex-shrink-0" />
          <input
            type="text"
            placeholder="Novo status (ex: EM ANÁLISE)"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="submit" disabled={saving} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

const emptyForm = {
  nome_loja: "", proprietario: "", status: "", categorias: [] as Categoria[],
  regiao: "", cidade: "", bairro: "", cep: "", endereco: "", estado: "",
  horario_de_funcionamento: "", informacoes: ""
};

function StoreFormModal({ store, statusTipos, onClose, onSave }: { store: Concessionaria | null; statusTipos: StatusTipo[]; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState<any>(store ? { ...store } : {
    ...emptyForm,
    status: statusTipos[0]?.nome || "",
  });

  const [contatos, setContatos] = useState<Contato[]>(
    store?.contatos && store.contatos.length > 0
      ? store.contatos.map(c => ({ ...c }))
      : [{ nome: "", telefone: "" }]
  );

  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [manualCoords, setManualCoords] = useState(false);
  const [lat, setLat] = useState<string>(store?.lat ? String(store.lat) : "");
  const [lng, setLng] = useState<string>(store?.lng ? String(store.lng) : "");

  const toggleCategoria = (cat: Categoria) => {
    setFormData((prev: any) => {
      const current: Categoria[] = prev.categorias || [];
      const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
      return { ...prev, categorias: next };
    });
  };

  const addContato = () => setContatos(prev => [...prev, { nome: "", telefone: "" }]);
  const removeContato = (idx: number) => setContatos(prev => prev.filter((_, i) => i !== idx));
  const updateContato = (idx: number, field: 'nome' | 'telefone', value: string) => {
    setContatos(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleCepBlur = async () => {
    const cep = (formData.cep || "").trim();
    if (cep.replace(/\D/g, '').length !== 8) return;
    setCepLoading(true);
    const data = await fetchCepData(cep);
    setCepLoading(false);
    if (!data) return;
    setFormData((prev: any) => ({
      ...prev,
      endereco: data.logradouro ? `${data.logradouro}${prev.endereco?.match(/,\s*\d+.*$/)?.[0] || ''}` : prev.endereco,
      bairro: data.bairro || prev.bairro,
      cidade: data.cidade || prev.cidade,
      estado: data.estado || prev.estado,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    let finalLat: number | null = null;
    let finalLng: number | null = null;

    if (manualCoords) {
      finalLat = lat ? parseFloat(lat) : null;
      finalLng = lng ? parseFloat(lng) : null;
    } else {
      const geocoded = await geocodeFullAddress({
        endereco: formData.endereco,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
      });
      if (!geocoded) {
        setSaving(false);
        setSaveError("Não conseguimos localizar esse endereço no mapa automaticamente. Confira o endereço ou informe a latitude/longitude manualmente abaixo.");
        setManualCoords(true);
        return;
      }
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }

    const payload: any = {
      nome_loja: formData.nome_loja,
      proprietario: formData.proprietario || null,
      status: formData.status,
      categorias: formData.categorias || [],
      endereco: formData.endereco,
      bairro: formData.bairro || null,
      cidade: formData.cidade,
      regiao: formData.regiao || null,
      estado: formData.estado || null,
      cep: formData.cep || null,
      horario_de_funcionamento: formData.horario_de_funcionamento || null,
      informacoes: formData.informacoes || null,
      lat: finalLat,
      lng: finalLng,
    };

    const validContatos = contatos
      .map(c => ({ nome: c.nome.trim(), telefone: c.telefone.trim() }))
      .filter(c => c.nome || c.telefone);

    let resError = null;
    let storeId = store?.id;

    if (store?.id) {
      const { error } = await supabase.from('concessionarias').update(payload).eq('id', store.id);
      resError = error;
    } else {
      const { data, error } = await supabase.from('concessionarias').insert([payload]).select('id').single();
      resError = error;
      storeId = data?.id;
    }

    if (!resError && storeId) {
      // Substitui todos os contatos: remove os antigos e insere os atuais
      const { error: delError } = await supabase.from('contatos').delete().eq('concessionaria_id', storeId);
      if (delError) resError = delError;

      if (!resError && validContatos.length > 0) {
        const { error: insError } = await supabase.from('contatos').insert(
          validContatos.map(c => ({ ...c, concessionaria_id: storeId }))
        );
        resError = insError;
      }
    }

    setSaving(false);

    if (resError) {
       console.error("Erro ao salvar:", resError);
       setSaveError(resError.message);
    } else {
       onSave();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col my-8 max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-black text-slate-800">
            {store ? 'Editar Concessionária' : 'Cadastrar Nova Concessionária'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-red-200">
            <X size={20} />
          </button>
        </div>

        {saveError && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-lg border border-red-200">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="col-span-full md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome da Loja *</label>
              <input required type="text" value={formData.nome_loja || ""} onChange={e => setFormData({...formData, nome_loja: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status *</label>
              <select required value={formData.status || ""} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold">
                <option value="" disabled>Selecione...</option>
                {statusTipos.map(tipo => (
                  <option key={tipo.id} value={tipo.nome}>{tipo.nome}</option>
                ))}
              </select>
              {statusTipos.length === 0 && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Nenhum status cadastrado ainda — use o botão "Status" no topo da página.</p>
              )}
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categorias *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map(cat => {
                  const active = (formData.categorias || []).includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategoria(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-full font-bold text-slate-700 border-b border-slate-100 pb-2 mt-4 text-sm uppercase">Localização</div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cep || ""}
                  onChange={e => setFormData({...formData, cep: e.target.value})}
                  onBlur={handleCepBlur}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 00000-000"
                />
                {cepLoading && <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Digite o CEP e clique fora do campo: preenchemos rua, bairro, cidade e estado sozinhos.</p>
            </div>

            <div className="col-span-full md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Endereço (Rua, Número) *</label>
              <input required type="text" value={formData.endereco || ""} onChange={e => setFormData({...formData, endereco: e.target.value})} placeholder="Preenchido pelo CEP — complete com o número" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bairro</label>
              <input type="text" value={formData.bairro || ""} onChange={e => setFormData({...formData, bairro: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cidade *</label>
              <input required type="text" value={formData.cidade || ""} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
              <input type="text" value={formData.estado || ""} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Região</label>
              <input type="text" value={formData.regiao || ""} onChange={e => setFormData({...formData, regiao: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            {manualCoords && (
              <div className="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><MapPin size={14} /> Não conseguimos localizar esse endereço automaticamente. Informe as coordenadas manualmente:</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude (ex: -22.9068)" className="px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono" />
                  <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude (ex: -43.1729)" className="px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono" />
                </div>
              </div>
            )}

            <div className="col-span-full font-bold text-slate-700 border-b border-slate-100 pb-2 mt-4 text-sm uppercase">Responsável</div>

            <div className="col-span-full md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Proprietário</label>
              <input type="text" value={formData.proprietario || ""} onChange={e => setFormData({...formData, proprietario: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            {/* Contatos dinâmicos */}
            <div className="col-span-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mt-2 mb-3">
                <span className="font-bold text-slate-700 text-sm uppercase">Contatos</span>
                <button type="button" onClick={addContato} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                  <Plus size={14} /> Adicionar contato
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {contatos.map((c, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      placeholder="Nome do contato"
                      value={c.nome}
                      onChange={e => updateContato(idx, 'nome', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Telefone"
                      value={c.telefone}
                      onChange={e => updateContato(idx, 'telefone', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeContato(idx)}
                      disabled={contatos.length === 1}
                      className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      title="Remover contato"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-full font-bold text-slate-700 border-b border-slate-100 pb-2 mt-4 text-sm uppercase">Dados Operacionais</div>

            <div className="col-span-full md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horário de Funcionamento</label>
              <input type="text" value={formData.horario_de_funcionamento || ""} onChange={e => setFormData({...formData, horario_de_funcionamento: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Informações Adicionais / Observações</label>
              <textarea value={formData.informacoes || ""} onChange={e => setFormData({...formData, informacoes: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" />
            </div>

          </div>

          <div className="flex gap-4 pt-4 mt-auto border-t border-slate-100 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-300 text-slate-800 bg-white rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex flex-row items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm border border-transparent">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? (manualCoords ? 'Salvando...' : 'Localizando endereço...') : 'Salvar Concessionária'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
