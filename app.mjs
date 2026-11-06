import { calculate, priceLabel, locations } from './pricing.mjs';

const form = document.querySelector('#service-form');
const bookingForm = document.querySelector('#booking-form');
const $ = selector => document.querySelector(selector);
let current;
let currentLocation;
function render() {
  const selected = [...form.querySelectorAll('[name="service"]:checked')].map(input => input.value);
  currentLocation = form.querySelector('[name="location"]:checked').value;
  current = calculate(selected, currentLocation);
  const hasWash = selected.includes('interior') || selected.includes('exterior');
  const missingWash = !hasWash && selected.length > 0;
  $('#wash-required').hidden = !missingWash;
  form.querySelector('.wash-section').classList.toggle('needs-wash', missingWash);
  $('#receipt').replaceChildren(...current.items.map(item => {
    const row = document.createElement('div');
    row.className = 'receipt-row';
    const title = document.createElement('span');
    title.textContent = item.name;
    const price = document.createElement('span');
    price.className = 'receipt-price';
    price.textContent = priceLabel(item);
    row.append(title, price);
    return row;
  }));
  if (!current.items.length) {
    const empty = document.createElement('p');
    empty.className = 'receipt-empty';
    empty.textContent = 'Vali pesu või hooldus. Sinu teenused ilmuvad siia.';
    $('#receipt').append(empty);
  }
  $('#summary-count').textContent = selected.length === 1 ? '1 teenus' : `${selected.length} teenust`;
  $('#summary-title').textContent = selected.length ? 'Läige on plaanis.' : 'Sinu puhas algus.';
  $('#bundle-saving').hidden = !current.combined;
  $('#bundle-applied').hidden = !current.combined;
  $('#choose-bundle').hidden = current.combined;
  $('#bundle-message').textContent = current.combined ? 'Pakett rakendus automaatselt. Säästad vähemalt 10 €.' : 'Vali mõlemad pesud ja säästa vähemalt 10 €.';
  $('#location-note').textContent = locations[currentLocation].description;
  $('#summary-location').textContent = currentLocation === 'mobile'
    ? 'Sinu juures · kohaletulek +10 €'
    : `${locations[currentLocation].name} · ${locations[currentLocation].address}`;
  const number = current.starting || current.min === current.max ? String(current.min) : `${current.min}–${current.max}`;
  const totalNodes = [];
  if (current.starting) {
    const from = document.createElement('span');
    from.className = 'from';
    from.textContent = 'alates';
    totalNodes.push(from);
  }
  const amount = document.createElement('span');
  amount.textContent = number;
  const euro = document.createElement('small');
  euro.textContent = '€';
  $('#total').replaceChildren(...totalNodes, amount, euro);
  $('#mobile-price').textContent = priceLabel(current);
  const notes = [];
  if (!selected.length) notes.push('Vali sisepesu või välispesu, et näha hinnangulist summat.');
  else if (!hasWash) notes.push('Lisahooldused on saadaval ainult koos sise- või välispesuga.');
  else if (current.starting) notes.push('„Alates” hinnaga teenuste lõplik summa sõltub töö mahust.' + (current.combined ? ' Pesupaketi osa on 50 €.' : ''));
  else notes.push('Täpne hind ja töö maht kinnitatakse enne töö algust.');
  if (currentLocation === 'mobile' && selected.length) notes.push('Kohaletuleku tasu +10 € sisaldub summas.');
  $('#total-note').textContent = notes.join(' ');
  $('#copy-summary').disabled = !selected.length;
  $('#book-button').disabled = !hasWash;
  current.hasWash = hasWash;
  $('#booking-selection').value = current.items.map(item => `${item.name}: ${priceLabel(item)}`).join('\n');
  $('#booking-location').value = currentLocation === 'mobile'
    ? 'Sinu juures · kohaletulek +10 €'
    : `${locations[currentLocation].name} · ${locations[currentLocation].address}`;
  $('#booking-total').value = priceLabel(current);
  $('#feedback').textContent = '';
}
function summaryText() {
  return ['LÄIKELABOR ÕF · Minu valik', '', ...current.items.map(item => `${item.name}: ${priceLabel(item)}`), '', `Asukoht: ${locations[currentLocation].name} · ${locations[currentLocation].address}`, `Kokku: ${priceLabel(current)}`, '', $('#total-note').textContent, 'Aeg, teenuste sobivus ja lõplik hind kokkuleppel.'].join('\n');
}
form.addEventListener('change', render);
form.addEventListener('submit', event => event.preventDefault());
$('#choose-bundle').addEventListener('click', () => {
  for (const value of ['interior', 'exterior']) form.querySelector(`[value="${value}"]`).checked = true;
  render();
  form.querySelector('[value="interior"]').focus({ preventScroll: true });
});
$('#reset').addEventListener('click', () => {
  form.querySelectorAll('[name="service"]').forEach(input => { input.checked = false; });
  form.querySelector('[value="kakumae"]').checked = true;
  render();
  $('#feedback').textContent = 'Valikud tühjendatud.';
});
$('#copy-summary').addEventListener('click', async () => {
  if (!current.items.length) return;
  const content = summaryText();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(content);
    $('#feedback').textContent = 'Kokkuvõte kopeeritud!';
  } catch {
    $('#copy-text').value = content;
    $('#copy-dialog').showModal();
    $('#copy-text').focus();
    $('#copy-text').select();
  }
});
$('#close-dialog').addEventListener('click', () => $('#copy-dialog').close());
$('#jump-summary').addEventListener('click', () => $('#summary').focus({ preventScroll: true }));
bookingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!current.hasWash) {
    $('#booking-feedback').textContent = 'Vali vähemalt sisepesu või välispesu.';
    $('#wash-required').hidden = false;
    return;
  }
  if (!bookingForm.reportValidity()) return;
  const button = $('#book-button');
  const feedback = $('#booking-feedback');
  button.disabled = true;
  button.querySelector('span').textContent = 'Saadan…';
  feedback.textContent = '';
  try {
    const formData = new FormData(bookingForm);
    // Saved to the database + e-mail notification, and in parallel to Netlify Forms as a backup.
    const [direct, netlifyForm] = await Promise.allSettled([
      fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      }),
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      })
    ]);
    const ok = result => result.status === 'fulfilled' && result.value.ok;
    if (!ok(direct) && !ok(netlifyForm)) throw new Error('Submission failed');
    bookingForm.reset();
    render();
    feedback.textContent = 'Broneering saadetud! Võtame sinuga telefoni teel ühendust, et kinnitada aeg ja lõplik hind.';
    document.querySelector('#booking-success-dialog').showModal();
  } catch {
    feedback.textContent = 'Saatmine ei õnnestunud. Palun proovi uuesti.';
  } finally {
    button.disabled = !current.hasWash;
    button.querySelector('span').textContent = 'Saada broneering';
  }
});
render();

// Tagasiside
const reviewForm = $('#review-form');
const reviewList = $('#review-list');
const dateFormat = new Intl.DateTimeFormat('et-EE', { day: 'numeric', month: 'long', year: 'numeric' });
function starsNode(rating) {
  const el = document.createElement('span');
  el.className = 'stars';
  el.setAttribute('aria-label', `${rating} / 5`);
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.textContent = '★';
    if (i > rating) star.className = 'off';
    el.append(star);
  }
  return el;
}
function renderReviews(reviews) {
  if (!reviews.length) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'Tagasisidet veel pole. Ole esimene!';
    reviewList.replaceChildren(empty);
    $('#reviews-score').hidden = true;
    return;
  }
  reviewList.replaceChildren(...reviews.map(review => {
    const card = document.createElement('article');
    card.className = 'review-card';
    const head = document.createElement('header');
    const name = document.createElement('strong');
    name.textContent = review.name;
    const time = document.createElement('time');
    time.dateTime = review.createdAt;
    time.textContent = dateFormat.format(new Date(review.createdAt));
    head.append(name, time);
    const text = document.createElement('p');
    text.textContent = review.message;
    card.append(head, starsNode(review.rating), text);
    return card;
  }));
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  $('#reviews-average').textContent = average.toFixed(1).replace('.', ',');
  $('#reviews-stars').replaceChildren(...starsNode(Math.round(average)).childNodes);
  $('#reviews-count').textContent = reviews.length === 1 ? '1 tagasiside' : `${reviews.length} tagasisidet`;
  $('#reviews-score').hidden = false;
}
async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    if (!response.ok) throw new Error('Load failed');
    renderReviews(await response.json());
  } catch {
    const error = document.createElement('p');
    error.className = 'review-empty';
    error.textContent = 'Tagasisidet ei õnnestunud laadida.';
    reviewList.replaceChildren(error);
  }
}
reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  const feedback = $('#review-feedback');
  const data = Object.fromEntries(new FormData(reviewForm));
  if (!data.name?.trim() || !data.rating || (data.message ?? '').trim().length < 3) {
    feedback.textContent = 'Palun lisa nimi, hinnang ja tagasiside.';
    return;
  }
  const button = $('#review-button');
  button.disabled = true;
  button.querySelector('span').textContent = 'Saadan…';
  feedback.textContent = '';
  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Submit failed');
    reviewForm.reset();
    feedback.textContent = 'Aitäh tagasiside eest!';
    await loadReviews();
  } catch {
    feedback.textContent = 'Saatmine ei õnnestunud. Palun proovi uuesti.';
  } finally {
    button.disabled = false;
    button.querySelector('span').textContent = 'Avalda tagasiside';
  }
});
loadReviews();
