import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Banner, Photo } from './Photo.jsx';
import SwipeRow from './SwipeRow.jsx';
import ItemSheet from './ItemSheet.jsx';
import CurrencyPicker from './CurrencyPicker.jsx';
import BudgetGauge, { BudgetSheet } from './BudgetGauge.jsx';
import { guessCategory } from '../lib/categories.js';
import { MAX_PRICE_MINOR, itemsTotal, uid } from '../lib/storage.js';
import { convertMinor, currencySymbol, formatNumber, toMinor } from '../lib/money.js';
import { useAmountField } from '../lib/useAmountField.js';

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function Thumb({ cat }) {
  return (
    <span className={`thumb cat-${cat}`} aria-hidden="true">
      <Icon name={cat} size={20} />
      <Photo name={`cat-${cat}`} />
    </span>
  );
}

export default function ShoppingList({ state, patch, fx, toast, goConvert, draft, setDraft }) {
  const { items, currency } = state;
  // Le brouillon vit dans l'App : changer d'onglet ne fait plus perdre l'article en cours de saisie.
  const { name, price } = draft;
  const setName = (v) => setDraft((d) => ({ ...d, name: v }));
  const setPrice = (v) => setDraft((d) => ({ ...d, price: v }));
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [picking, setPicking] = useState(false);
  const [budgeting, setBudgeting] = useState(false);
  const nameRef = useRef(null);
  const priceRef = useRef(null);
  const priceField = useAmountField(price, setPrice, currency);

  const total = itemsTotal(items);
  const done = items.filter((i) => i.done);
  const symbol = currencySymbol(currency);

  const setItems = (fn) => patch((s) => ({ items: fn(s.items) }));

  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setError('Écrivez d’abord le nom de l’article.'); nameRef.current?.focus(); return; }
    const minor = price.trim() ? toMinor(price, currency) : 0;
    if (minor == null) { setError('Ce prix n’est pas valide.'); priceRef.current?.focus(); return; }
    if (minor > MAX_PRICE_MINOR) { setError('Ce prix est trop élevé.'); priceRef.current?.focus(); return; }
    setItems((list) => [{ id: uid(), name: n, priceMinor: minor, qty: 1, done: false, cat: guessCategory(n) }, ...list]);
    setDraft({ name: '', price: '' }); setError('');
    nameRef.current?.focus();
  };

  const remove = (item) => {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((list) => list.filter((i) => i.id !== item.id));
    if (!state.hintSeen) patch({ hintSeen: true });
    toast({
      text: `« ${item.name} » retiré`,
      undo: () => setItems((list) => (list.some((i) => i.id === item.id) ? list : [...list.slice(0, index), item, ...list.slice(index)]))
    });
  };

  const clearDone = () => {
    const order = items.map((i) => i.id);
    const removed = items.filter((i) => i.done);
    setItems((list) => list.filter((i) => !i.done));
    // « Annuler » ne remet que les articles retirés, à leur place : ce qui a été ajouté ou modifié entre-temps reste.
    toast({
      text: plural(removed.length, 'article retiré', 'articles retirés'),
      undo: () => setItems((list) => {
        const have = new Set(list.map((i) => i.id));
        const back = removed.filter((i) => !have.has(i.id));
        const rank = (i) => { const k = order.indexOf(i.id); return k === -1 ? -1 : k; };
        return [...list, ...back].sort((a, b) => rank(a) - rank(b));
      })
    });
  };

  const changeCurrency = (code) => {
    setPicking(false);
    if (code === currency) return;
    if (!items.length && !state.budget) { patch({ currency: code }); return; }
    const r = fx.rate(currency, code);
    if (r == null) { toast({ text: 'Taux indisponibles : impossible de convertir vos prix pour le moment.' }); return; }
    const before = { items, currency, budget: state.budget };
    patch({ currency: code, budget: convertMinor(state.budget, currency, code, r), items: items.map((i) => ({ ...i, priceMinor: convertMinor(i.priceMinor, currency, code, r) })) });
    toast({ text: `Prix convertis en ${code}`, undo: () => patch(before) });
  };

  return (
    <>
      <div className="total-stack">
      <section className="card total-card" aria-labelledby="total-label">
        <Banner name="hero-market" />
        <div className="total-body">
          <div className="total-top">
            <span className="eyebrow" id="total-label">Total de la liste</span>
            <div className="total-actions">
              <button type="button" className="privacy-btn" onClick={() => patch({ totalHidden: !state.totalHidden })}
                aria-label={state.totalHidden ? 'Afficher le total' : 'Masquer le total'} aria-pressed={state.totalHidden}
                title={state.totalHidden ? 'Afficher le total' : 'Masquer le total'}>
                <Icon name={state.totalHidden ? 'eyeOff' : 'eye'} size={19} />
              </button>
              <button type="button" className="pill" onClick={() => setPicking(true)} aria-label={`Devise de la liste : ${currency}. Changer`}>
                {currency}<Icon name="chevron" size={16} />
              </button>
            </div>
          </div>
          <p className="total-amount" aria-live="polite" aria-atomic="true">
            <span className={`bump ${state.totalHidden ? 'is-hidden' : ''}`} key={state.totalHidden ? 'hidden' : total}>
              {state.totalHidden ? '••••••' : formatNumber(total, currency)}
            </span>
            <span className="unit">{symbol}</span>
          </p>
          <div className="total-foot">
            <p>
              {items.length ? `${plural(items.length, 'article', 'articles')}${done.length ? ` · ${done.length} dans le panier` : ''}` : 'Aucun article pour l’instant'}
            </p>
            {total > 0 && (
              <button type="button" className="link-btn" onClick={() => goConvert(total)}>
                Convertir<Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      <BudgetGauge total={total} budget={state.budget} currency={currency} hidden={state.totalHidden} onEdit={() => setBudgeting(true)} />
      </div>

      <form className="card composer" onSubmit={add} noValidate>
        <label className="sr-only" htmlFor="new-name">Nom de l’article</label>
        <input
          id="new-name" ref={nameRef} className="composer-name" placeholder="Nouvel article" value={name} maxLength={60}
          autoComplete="off" enterKeyHint="next"
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); priceRef.current?.focus(); } }}
        />
        <label className="sr-only" htmlFor="new-price">Prix en {currency}</label>
        <div className="input-suffix composer-price">
          <input id="new-price" {...priceField} ref={(n) => { priceRef.current = n; priceField.ref.current = n; }} placeholder="Prix" enterKeyHint="done"
            onChange={(e) => { priceField.onChange(e); setError(''); }} />
          <em>{symbol}</em>
        </div>
        <button type="submit" className="add-btn" aria-label="Ajouter à la liste"><Icon name="plus" size={24} stroke={2.4} /></button>
        {error && <p className="form-error composer-error" role="alert">{error}</p>}
      </form>

      {items.length === 0 ? (
        <section className="empty" aria-label="Liste vide">
          <div className="empty-art"><Icon name="basket" size={46} stroke={1.5} /><Photo name="empty-basket" /></div>
          <h2>Votre panier est vide</h2>
          <p>Notez ce qu’il vous faut et son prix : le total se calcule tout seul, au fur et à mesure.</p>
        </section>
      ) : (
        <>
          {!state.hintSeen && (
            <p className="hint">
              <span>Faites glisser un article vers la gauche pour le retirer.</span>
              <button type="button" className="icon-btn sm" onClick={() => patch({ hintSeen: true })} aria-label="Masquer l’astuce"><Icon name="close" size={16} /></button>
            </p>
          )}
          <ul className="items" aria-label="Articles de la liste">
            {items.map((item) => {
              const line = item.priceMinor * item.qty;
              return (
                <SwipeRow key={item.id} name={item.name} onDelete={() => remove(item)}>
                  <div className={`item ${item.done ? 'is-done' : ''}`}>
                    <button type="button" role="checkbox" aria-checked={item.done} className="check" onClick={() => setItems((l) => l.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))} aria-label={`${item.name} : ${item.done ? 'remettre à acheter' : 'mettre dans le panier'}`}>
                      <Icon name="check" size={16} stroke={3} />
                    </button>
                    <button type="button" className="item-main" onClick={() => setEditing(item)} aria-label={`Modifier ${item.name}`}>
                      <Thumb cat={item.cat} />
                      <span className="item-text">
                        <strong>{item.name}</strong>
                        {item.qty > 1 && <small>× {item.qty}</small>}
                      </span>
                      <span className="item-price">
                        {item.priceMinor ? <><strong>{state.totalHidden ? '••••••' : formatNumber(line, currency)}<i>{symbol}</i></strong>{item.qty > 1 && <small>{state.totalHidden ? '••••' : `${formatNumber(item.priceMinor, currency)} × ${item.qty}`}</small>}</> : <small className="no-price">Prix à saisir</small>}
                      </span>
                    </button>
                  </div>
                </SwipeRow>
              );
            })}
          </ul>
          {done.length > 0 && (
            <button type="button" className="btn btn-quiet clear-done" onClick={clearDone}>
              Retirer {plural(done.length, 'article coché', 'articles cochés')}
            </button>
          )}
        </>
      )}

      {editing && (
        <ItemSheet
          item={editing} currency={currency} onClose={() => setEditing(null)}
          onSave={(next) => {
            // Renommer un article met aussi à jour son rayon, comme à la création.
            setItems((l) => l.map((i) => (i.id === editing.id ? { ...i, ...next, cat: next.name !== i.name ? guessCategory(next.name) : i.cat } : i)));
            setEditing(null);
          }}
          onDelete={() => { const it = editing; setEditing(null); remove(it); }}
        />
      )}
      {budgeting && <BudgetSheet budget={state.budget} currency={currency} onClose={() => setBudgeting(false)} onSave={(budget) => { patch({ budget }); setBudgeting(false); }} />}
      {picking && <CurrencyPicker title="Devise de la liste" current={currency} codes={fx.currencies()} onPick={changeCurrency} onClose={() => setPicking(false)} />}
    </>
  );
}
