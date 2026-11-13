import './styles.css';
import { WINES } from './catalog';
import {
  CATEGORY_LABELS,
  FLAVOR_OPTIONS,
  FOOD_OPTIONS,
  SWEETNESS_OPTIONS,
  SWEETNESS_WORDS,
  type Option,
} from './quiz';
import { explain, hasAnyAnswer, topMatches } from './ranking';
import type { FlavorId, FoodId, QuizAnswers, RankedWine, SweetnessPref, Unsure } from './types';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/* ───────────── Quiz rendering ───────────── */

interface QuestionDef {
  id: string;
  name: 'food' | 'sweetness' | 'flavors';
  number: string;
  title: string;
  help: string;
  type: 'radio' | 'checkbox';
  options: Option<string>[];
}

const QUESTIONS: QuestionDef[] = [
  {
    id: 'q-food',
    name: 'food',
    number: '01',
    title: 'What are you eating?',
    help: 'Pick the closest match.',
    type: 'radio',
    options: FOOD_OPTIONS,
  },
  {
    id: 'q-sweetness',
    name: 'sweetness',
    number: '02',
    title: 'How sweet do you like your wine?',
    help: 'Most wines on restaurant lists are dry.',
    type: 'radio',
    options: SWEETNESS_OPTIONS,
  },
  {
    id: 'q-flavors',
    name: 'flavors',
    number: '03',
    title: 'Which flavors or textures sound good?',
    help: 'Choose as many as you like.',
    type: 'checkbox',
    options: [...FLAVOR_OPTIONS, { value: 'unsure', label: 'I’m not sure', hint: 'Surprise me', emoji: '🤷' }],
  },
];

function renderQuestion(q: QuestionDef): string {
  const options = q.options
    .map(
      (o) => `
      <label class="option${o.value === 'unsure' ? ' option--unsure' : ''}">
        <input type="${q.type}" name="${q.name}" value="${esc(o.value)}" />
        <span class="option-body">
          <span class="option-emoji" aria-hidden="true">${o.emoji}</span>
          <span class="option-text">
            <span class="option-label">${esc(o.label)}</span>
            ${o.hint ? `<span class="option-hint">${esc(o.hint)}</span>` : ''}
          </span>
        </span>
      </label>`,
    )
    .join('');
  return `
    <fieldset class="question" id="${q.id}" aria-describedby="${q.id}-help">
      <legend>
        <span class="q-num" aria-hidden="true">${q.number}</span>
        <span class="q-title">${esc(q.title)}</span>
      </legend>
      <p class="q-help" id="${q.id}-help">${esc(q.help)}</p>
      <div class="options options--${q.name}">${options}</div>
    </fieldset>`;
}

$('#quiz-questions').innerHTML = QUESTIONS.map(renderQuestion).join('');

const form = $<HTMLFormElement>('#quiz-form');

function readAnswers(): QuizAnswers {
  const data = new FormData(form);
  const food = (data.get('food') as FoodId | Unsure | null) ?? null;
  const sweetness = (data.get('sweetness') as SweetnessPref | Unsure | null) ?? null;
  const flavors = (data.getAll('flavors') as string[]).filter((f): f is FlavorId => f !== 'unsure');
  return { food, sweetness, flavors };
}

/* ───────────── Results rendering ───────────── */

const labelOf = (opts: Option<string>[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

function renderMeter(label: string, value: number | null, describe: (v: number) => string): string {
  if (value === null) {
    return `
      <div class="meter meter--na">
        <dt>${label}</dt>
        <dd><span class="meter-na">—</span><span class="sr-only">not a factor for this style</span></dd>
      </div>`;
  }
  const dots = Array.from({ length: 5 }, (_, i) => `<span class="dot${i < value ? ' is-on' : ''}"></span>`).join('');
  return `
    <div class="meter">
      <dt>${label}</dt>
      <dd><span class="dots" role="img" aria-label="${value} out of 5, ${describe(value)}">${dots}</span></dd>
    </div>`;
}

const LEVEL_WORDS = ['', 'very low', 'low', 'medium', 'high', 'very high'];
const BODY_WORDS = ['', 'very light', 'light', 'medium', 'full', 'very full'];

function renderProfile(r: RankedWine): string {
  const w = r.wine;
  return `
    <dl class="profile">
      ${renderMeter('Sweetness', w.sweetness, (v) => SWEETNESS_WORDS[v])}
      ${renderMeter('Acidity', w.acidity, (v) => LEVEL_WORDS[v])}
      ${renderMeter('Body', w.body, (v) => BODY_WORDS[v])}
      ${renderMeter('Tannin', w.tannin, (v) => LEVEL_WORDS[v])}
    </dl>`;
}

function renderMatch(r: RankedWine, index: number, answers: QuizAnswers): string {
  const w = r.wine;
  const isTop = index === 0;
  const headingId = `match-${index}`;
  const reasons = explain(r, answers)
    .map((reason) => `<li>${esc(reason)}</li>`)
    .join('');
  const notes = w.flavorNotes.map((n) => `<li>${esc(n)}</li>`).join('');
  return `
    <article class="match ${isTop ? 'match--top' : 'match--alt'}" aria-labelledby="${headingId}">
      <p class="match-rank">${isTop ? 'Top match' : `Alternative ${index}`}</p>
      <p class="match-category"><span class="cat-swatch cat-${w.category}" aria-hidden="true"></span>${CATEGORY_LABELS[w.category]}</p>
      <h3 id="${headingId}" class="match-name">${esc(w.name)}</h3>
      <p class="match-desc">${esc(w.description)}</p>
      <ul class="notes" aria-label="Flavor notes">${notes}</ul>
      <div class="why">
        <h4>${isTop ? 'Why it’s your match' : 'Why it ranked'}</h4>
        <ul class="reasons">${reasons}</ul>
      </div>
      <div class="look-for">
        <p class="look-for-label"><span aria-hidden="true">🛒</span> Look for</p>
        <p class="look-for-text">${esc(w.lookFor)}</p>
      </div>
      ${renderProfile(r)}
    </article>`;
}

function contextLine(a: QuizAnswers): string {
  const parts: string[] = [];
  if (a.food && a.food !== 'unsure') parts.push(labelOf(FOOD_OPTIONS, a.food));
  if (a.sweetness && a.sweetness !== 'unsure') parts.push(labelOf(SWEETNESS_OPTIONS, a.sweetness));
  for (const f of a.flavors) parts.push(labelOf(FLAVOR_OPTIONS, f));
  return parts.length
    ? `Based on: ${parts.map(esc).join(' · ')}`
    : 'No answers yet, so here are three versatile crowd-pleasers. Answer any question to personalize.';
}

let lastAnnouncement = '';

function update(): void {
  const answers = readAnswers();
  const matches = topMatches(WINES, answers, 3);
  const [top, ...alts] = matches;

  $('#results-title').textContent = hasAnyAnswer(answers) ? 'Your matches' : 'Crowd-pleasers to start with';
  $('#results-context').innerHTML = contextLine(answers);

  const body = $('#results-body');
  body.innerHTML = `
    ${renderMatch(top, 0, answers)}
    <div class="alts">
      <h3 class="alts-title">Or try one of these</h3>
      <div class="alts-grid">${alts.map((r, i) => renderMatch(r, i + 1, answers)).join('')}</div>
    </div>`;

  body.classList.remove('is-fresh');
  void body.offsetWidth; // restart the fade-in animation
  body.classList.add('is-fresh');

  const announcement = `Top match: ${top.wine.name}. Alternatives: ${alts.map((r) => r.wine.name).join(' and ')}.`;
  if (announcement !== lastAnnouncement) {
    $('#results-status').textContent = announcement;
    lastAnnouncement = announcement;
  }
}

/* "I'm not sure" for flavors is exclusive with the other flavor choices. */
form.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.name === 'flavors' && input.checked) {
    const boxes = form.querySelectorAll<HTMLInputElement>('input[name="flavors"]');
    boxes.forEach((b) => {
      if (input.value === 'unsure' ? b !== input : b.value === 'unsure') b.checked = false;
    });
  }
  update();
});

form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('reset', () => {
  // Reset runs after this event; read the cleared form on the next tick.
  setTimeout(() => {
    update();
    form.querySelector<HTMLInputElement>('input')?.focus();
  });
});

/* ───────────── Views (hash routing) ───────────── */

type Route = 'quiz' | 'explore';

function routeFromHash(): Route | null {
  const h = location.hash;
  if (h === '#explore') return 'explore';
  if (h === '' || h === '#' || h === '#quiz' || h === '#results') return 'quiz';
  return null; // e.g. #main — keep whatever view is showing
}

let currentRoute: Route = 'quiz';

function showRoute(route: Route, moveFocus: boolean): void {
  const changed = route !== currentRoute;
  currentRoute = route;
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((v) => {
    v.hidden = v.dataset.view !== route;
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = route === 'explore' ? 'Explore Wines · Uncorked' : 'Wine Pairing Quiz · Uncorked';

  if (!moveFocus) return;
  if (location.hash === '#results') {
    $('#results-title').focus({ preventScroll: true });
    $('#results').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  } else if (changed || location.hash === '#quiz' || location.hash === '#explore') {
    window.scrollTo({ top: 0 });
    $(route === 'explore' ? '#explore-title' : '#quiz-title').focus({ preventScroll: true });
  }
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('hashchange', () => {
  const route = routeFromHash();
  if (route) showRoute(route, true);
});

// Clicking a link to the hash we're already on doesn't fire hashchange — handle it so
// "See my matches" still jumps to (and focuses) the results every time.
document.addEventListener('click', (e) => {
  const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link || link.getAttribute('href') !== location.hash) return;
  const route = routeFromHash();
  if (route) {
    e.preventDefault();
    showRoute(route, true);
  }
});

showRoute(routeFromHash() ?? 'quiz', false);
update();
