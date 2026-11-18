import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../projects/ai-accessibility-tool/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../projects/ai-accessibility-tool/demo.js', import.meta.url), 'utf8');
const pastProjects = JSON.parse(readFileSync(new URL('../data/past-projects.json', import.meta.url), 'utf8'));

function mountDemo() {
  const makeElement = (tagName = '') => ({
    tagName, textContent: '', innerHTML: '', attributes: {}, listeners: {}, dataset: {},
    classList: { values: new Set(), toggle(name, force) { const add = force ?? !this.values.has(name); add ? this.values.add(name) : this.values.delete(name); return add; }, contains(name) { return this.values.has(name); }, remove(...names) { names.forEach(name => this.values.delete(name)); } },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    scrollBy() {},
    scrollIntoView() {}
  });
  const article = makeElement();
  const headingNodes = [];
  article.querySelectorAll = () => headingNodes;
  Object.defineProperty(article, 'innerHTML', {
    get() { return this._html || ''; },
    set(value) {
      this._html = value;
      headingNodes.length = 0;
      for (const [,tag,markup] of value.matchAll(/<(h2|h3)>([\s\S]*?)<\/\1>/g)) {
        const heading = makeElement(tag.toUpperCase());
        heading.textContent = markup.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
        headingNodes.push(heading);
      }
    }
  });
  const selectors = ['.running-head span:last-child','.chapter-label','.chapter-intro h1','.subtitle','.page-number','#heading-name','#visual','#visual-caption','#now-label','#companion','#reading-track','#selection-status','#previous-reading','#next-reading','#collapse'];
  const elements = Object.fromEntries(selectors.map(selector => [selector, makeElement()]));
  const cardNames = ['water','space','garden'];
  const cards = cardNames.map(reading => { const card=makeElement(); card.dataset.reading=reading; return card; });
  let observeCallback;
  class IO { constructor(cb) { observeCallback=cb; } observe() {} disconnect() {} }
  const document = {
    querySelector(selector) { return selector === '.reading' ? article : elements[selector]; },
    querySelectorAll(selector) { return selector === '.reading-card' ? cards : selector === '.reading h2, .reading h3' ? headingNodes : []; }
  };
  const window = {IntersectionObserver:IO, addEventListener(){}};
  vm.runInNewContext(script, {document,window,IntersectionObserver:IO,innerHeight:800,console,setTimeout:fn=>fn()});
  return {article,cards,elements,headingNodes,update(entries) { observeCallback(entries.map(([target,top])=>({target,isIntersecting:true,boundingClientRect:{top}}))); }};
}

test('Past Projects route serves the self-contained demo and its script', () => {
  const project = pastProjects.find(item => item.id === 'ai-accessibility');
  assert.equal(project?.type, 'iframe');
  assert.equal(project?.projectUrl, 'projects/ai-accessibility-tool/index.html');
  assert.match(readFileSync(new URL('../src/js/router.js', import.meta.url), 'utf8'), /project\.type === 'iframe'/);
  assert.match(html, /<main class="page">[\s\S]*<article class="reading"/);
  assert.match(html, /position:fixed/);
  assert.match(html, /<script src="\.\/demo\.js"><\/script>/);
});

test('scrolling headings creates the corresponding topic-specific illustration', () => {
  const {headingNodes,elements,update}=mountDemo();
  const testCases=[
    ['Evaporation: water rises','PLATE I · EVAPORATION'],
    ['Condensation: clouds form','PLATE II · CONDENSATION'],
    ['Precipitation: water returns','PLATE III · PRECIPITATION'],
    ['Collection and runoff: the journey continues','PLATE IV · COLLECTION']
  ];
  for (const [headingText,visualLabel] of testCases) {
    const heading=headingNodes.find(item=>item.textContent===headingText);
    assert.ok(heading,`found ${headingText}`);
    update([[heading,180]]);
    assert.equal(elements['#heading-name'].textContent,headingText);
    assert.match(elements['#visual'].innerHTML,new RegExp(visualLabel));
    assert.match(elements['#visual'].innerHTML,/<svg[^>]+role="img"/);
  }
});

test('reading cards replace the passage and visual topic; carousel arrows are wired', () => {
  const {article,cards,elements}=mountDemo();
  cards[1].listeners.click();
  assert.match(elements['.chapter-intro h1'].textContent,/Our Solar System/);
  assert.match(article.innerHTML,/The Sun: our nearest star/);
  assert.match(elements['#visual'].innerHTML,/PLATE V · THE SOLAR SYSTEM/);
  assert.equal(cards[1].attributes['aria-pressed'],'true');
  cards[2].listeners.click();
  assert.match(elements['.chapter-intro h1'].textContent,/A Garden in Bloom/);
  assert.match(article.innerHTML,/Pollination: pollen travels/);
  assert.match(elements['#visual'].innerHTML,/PLATE VI · POLLINATION/);
  elements['#previous-reading'].listeners.click();
  assert.match(elements['.chapter-intro h1'].textContent,/Our Solar System/);
  assert.equal(cards[1].attributes['aria-pressed'],'true');
  elements['#next-reading'].listeners.click();
  assert.match(elements['.chapter-intro h1'].textContent,/A Garden in Bloom/);
  assert.equal(cards[2].attributes['aria-pressed'],'true');
});

test('visual companion collapses and expands accessibly', () => {
  const {elements}=mountDemo();
  const button=elements['#collapse'];
  button.listeners.click({currentTarget:button});
  assert.equal(elements['#companion'].classList.contains('collapsed'),true);
  assert.equal(button.attributes['aria-expanded'],'false');
  button.listeners.click({currentTarget:button});
  assert.equal(elements['#companion'].classList.contains('collapsed'),false);
  assert.equal(button.attributes['aria-expanded'],'true');
});

test('no remote API or image dependencies; narrow-screen and reduced-motion styles exist', () => {
  assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest/i);
  assert.doesNotMatch(html,/\<img[^>]+src=["']https?:/i);
  assert.match(html,/@media\(max-width:620px\)/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/overflow-x:auto/);
  assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
  assert.match(html,/--ink:#e8e3d6/);
  assert.match(html,/\.reading\.turn-forward/);
  assert.match(html,/Turn to next reading/);
  assert.match(html,/flex:0 0 224px/);
  assert.match(html,/Turn to previous reading/);
});
