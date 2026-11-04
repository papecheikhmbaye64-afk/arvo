# ARVO

Deux outils, rien d'autre : une **liste de courses** dont le total se calcule seul (suppression par balayage) et un **convertisseur de devises** instantané. Français, mode clair et sombre, hors ligne, installable (PWA).

```bash
npm install
npm run dev        # http://localhost:5173 (même Wi-Fi : l'adresse réseau est affichée)
npm run build      # produit dist/
npm test           # 7 tests : argent, parité CFA, taux, rayons
```

## Ce que fait l'appli
- **Courses** : nom + prix (optionnel) + quantité ; total en direct ; case « dans le panier » ; rayon reconnu automatiquement (Fruits & légumes, Boulangerie…) ; modification en touchant la ligne ; devise de la liste modifiable (les prix sont alors convertis, avec « Annuler »).
- **Suppression** : balayage vers la gauche (seuil, fond rouge qui s'arme, vibration légère sur mobile), ou touche Suppr, ou bouton visible au survol / au clavier. Toute suppression propose « Annuler » pendant 5 secondes.
- **Devises** : deux devises au choix (recherche parmi ~160), montant saisi avec séparateurs automatiques, résultat immédiat, inversion en un geste, « utiliser le total de mes courses ».
- **Taux** : ExchangeRate-API (sans clé), cache 6 h, dernier relevé conservé hors ligne, jamais de valeur inventée. La parité fixe 1 € = 655,957 FCFA est appliquée localement : EUR ↔ XOF/XAF fonctionne sans réseau.
- **Thème** : suit le système ; le bouton soleil/lune force clair ou sombre (mémorisé).
- **Photos** : voir `PHOTOS.md` (emplacements prêts, prompts fournis, rien à coder).

## Structure
| Chemin | Rôle |
|---|---|
| `src/App.jsx` | état global, navigation par `#/courses` et `#/devises`, thème, notifications |
| `src/components/ShoppingList.jsx`, `SwipeRow.jsx`, `ItemSheet.jsx` | liste, geste de balayage, édition |
| `src/components/Converter.jsx`, `CurrencyPicker.jsx` | convertisseur et sélecteur de devise |
| `src/lib/money.js` | montants en entiers (unités mineures), saisie et formats |
| `src/lib/fx.js` | taux, cache, parité CFA/euro |
| `src/lib/categories.js` | rayons et détection par mots entiers |
| `src/lib/storage.js` | persistance `localStorage` (clé conservée pour la compatibilité) |
| `src/styles/` | jetons clair/sombre, base, composants |
| `public/photos/` | photos à déposer |

Données stockées uniquement dans le navigateur (pas de compte, pas de synchronisation). Les données historiques d’une autre édition ne sont pas reprises.

## Déployer
Site statique : `npm run build` puis publier `dist/` (Netlify : voir `netlify.toml`, Vercel, GitHub Pages). Le service worker exige HTTPS ou localhost.

Taux : ExchangeRate-API (https://www.exchangerate-api.com). Indicatifs, hors frais bancaires.
