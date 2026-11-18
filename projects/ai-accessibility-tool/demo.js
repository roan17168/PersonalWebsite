// The prototype's core loop: choose or read a text, detect its headings, compile an image subject, and show a visual companion.
(() => {
  const readings = {
    water: {
      title: 'The Water Cycle', subject: 'Earth Science · Chapter 04 · Water', subtitle: 'A journey through the air, land, and living world', page: '84', className: 'Earth systems',
      lead: 'Water is always moving. It travels from the ocean to the atmosphere, falls onto land, and eventually finds its way back to the sea. This continuous journey is called the water cycle.',
      sections: [
        ['4.1', 'Water changes and moves', 'The Sun provides energy that drives much of the cycle. Water changes between liquid, gas, and solid states as it moves through the environment. As you read, the small visual companion in the corner follows the section headings and adds a picture to each idea.', ['Evaporation: water rises', 'When sunlight warms water in oceans, lakes, and rivers, some liquid water changes into an invisible gas called water vapor. The vapor rises into the air. Plants also release water vapor through a process called transpiration.', 'Together, evaporation and transpiration move water from Earth’s surface into the atmosphere. On a warm day, more water may evaporate; on a cool day, less does.'], ['Condensation: clouds form', 'Higher in the atmosphere, air is cooler. Water vapor cools and changes back into tiny liquid droplets. This change is condensation. The droplets gather around tiny particles in the air and form clouds.', 'Clouds are made of countless droplets or ice crystals. Wind carries them across the sky, sometimes far from the place where their water first evaporated.'], ['Precipitation: water returns', 'As cloud droplets collide, they grow. When they become too heavy to stay suspended, water falls as precipitation. It may arrive as rain, snow, sleet, or hail, depending on the temperature of the air.', 'Precipitation replenishes streams, lakes, and soil. Snow can store water until warmer weather melts it.']],
        ['4.2', 'Water gathers and begins again', 'Water completes its journey in many different ways before the cycle starts again.', ['Collection and runoff: the journey continues', 'Some water soaks into the ground and replenishes groundwater. Other water flows downhill as runoff, joining streams and rivers that carry it toward the ocean. From there, the Sun can warm it again, and the cycle continues.', 'Water may take days or thousands of years to complete one journey. Wherever it goes, it connects the atmosphere, land, and living things.']]
      ]
    },
    space: {
      title: 'Our Solar System', subject: 'Astronomy · Chapter 02 · Space', subtitle: 'A family of worlds held together by gravity', page: '42', className: 'Astronomy',
      lead: 'Our solar system is a neighborhood of the Milky Way. At its center, the Sun shines on planets, moons, and smaller worlds that travel through space.',
      sections: [
        ['2.1', 'The Sun and its family', 'The Sun is a star: a huge sphere of hot gas that gives Earth light and warmth. Its gravity reaches across space and helps keep the solar system together.', ['The Sun: our nearest star', 'The Sun formed billions of years ago. Deep inside it, tiny particles combine and release energy. Some of that energy travels through space as sunlight.', 'Although it looks small in our sky, the Sun is far larger than Earth. Its light takes about eight minutes to reach us.'], ['Planets travel in orbits', 'Eight planets travel around the Sun along paths called orbits. The inner planets are rocky. Farther out, giant planets are made mostly of gas and ice.', 'A planet’s orbit is shaped by gravity. Earth takes one year to make a complete trip around the Sun.']],
        ['2.2', 'Many kinds of worlds', 'The planets are only part of this system. Smaller bodies and moons help tell the story of how it formed.', ['Moons and smaller worlds', 'Moons orbit planets, while asteroids and comets travel around the Sun. Each world has its own landscape, from icy plains to dusty craters.', 'Studying these neighbors helps scientists understand Earth’s place in a much larger universe.']]
      ]
    },
    garden: {
      title: 'A Garden in Bloom', subject: 'Life Science · Chapter 03 · Plants', subtitle: 'How flowers turn sunlight into the next generation', page: '61', className: 'Life science',
      lead: 'A garden is full of quiet exchanges. Plants gather sunlight and water, while flowers invite animals to carry pollen from bloom to bloom.',
      sections: [
        ['3.1', 'A plant prepares to grow', 'Plants use sunlight, water, and air to make the food they need. Each part has a job in this living system.', ['Roots and stems', 'Roots anchor a plant and draw water from the soil. Stems support leaves and carry water upward toward the light.', 'Leaves collect sunlight. Inside them, plants use light energy to make sugars from water and carbon dioxide.']],
        ['3.2', 'Flowers carry life forward', 'A flower is more than a bright display. Its shape, color, and scent help the plant reproduce.', ['Pollination: pollen travels', 'Bees visit flowers to gather nectar. As they move, pollen grains cling to their bodies and travel to another flower. This transfer is called pollination.', 'When pollen reaches the right part of a flower, seeds can begin to form. The bee finds food, and the plant gets a chance to grow new life.'], ['Seeds grow into new plants', 'A seed holds a tiny plant and a store of food. When it lands in warm, damp soil, it can sprout roots and a new stem.', 'Over time, the young plant grows leaves, gathers sunlight, and may produce flowers of its own.']]
      ]
    }
  };

  const $ = selector => document.querySelector(selector);
  const article = $('.reading');
  const headingLabel = $('#heading-name');
  const visual = $('#visual');
  const caption = $('#visual-caption');
  const nowLabel = $('#now-label');
  const companion = $('#companion');
  const chooser = $('#reading-track');
  const cards = [...document.querySelectorAll('.reading-card')];
  let headingNodes = [];
  let observer = null;
  let lastHeading = null;
  let scrollFallbackInstalled = false;
  let activeReading = readings.water;

  const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function renderReading(reading) {
    activeReading = reading;
    document.title = `${reading.title} · Reading companion`;
    $('.running-head span:last-child').textContent = reading.subject.replace(' · ', '  ·  ');
    $('.chapter-label').textContent = reading.subject;
    $('.chapter-intro h1').textContent = reading.title;
    $('.subtitle').textContent = reading.subtitle;
    $('.page-number').textContent = reading.page;
    article.setAttribute('aria-label', `Textbook sample about ${reading.title}`);
    const sections = reading.sections.map(([number, title, intro, ...parts]) => {
      const introHtml = intro ? `<p>${escape(intro)}</p>` : '';
      const blocks = parts.map(([heading, ...paragraphs]) => `<h3>${escape(heading)}</h3>${paragraphs.map(text => `<p>${escape(text)}</p>`).join('')}`).join('');
      return `<h2><span class="number">${escape(number)}</span> ${escape(title)}</h2>${introHtml}${blocks}`;
    }).join('');
    article.innerHTML = `<p class="lead">${escape(reading.lead)}</p>${sections}<p class="endnote">End of the sample passage. Scroll through the chapter again to see the visual companion respond to each heading.</p>`;
    headingNodes = [...article.querySelectorAll('h2, h3')];
    lastHeading = null;
    watchHeadings();
    setHeading(headingNodes[0]);
  }

  function compilePrompt(heading) {
    const text = heading.textContent.replace(/^\s*\d+\.\d+\s*/, '').trim();
    const lower = `${text} ${activeReading.title} ${activeReading.className}`.toLowerCase();
    const topic = lower.includes('evaporation') ? 'evaporation'
      : lower.includes('condensation') || lower.includes('cloud') ? 'condensation'
      : lower.includes('precipitation') || lower.includes('rain') ? 'precipitation'
      : lower.includes('collection') || lower.includes('runoff') || lower.includes('gather') ? 'collection'
      : lower.includes('pollination') || lower.includes('flower') || lower.includes('garden') || lower.includes('seed') || lower.includes('plant') ? 'flower'
      : lower.includes('planet') || lower.includes('solar') || lower.includes('orbit') || lower.includes('star') || lower.includes('moon') ? 'space'
      : 'cycle';
    const style = ['watercolor textbook plate', 'natural-history illustration', 'soft editorial diagram'][text.length % 3];
    return { text, topic, style };
  }
  function createImage(prompt) {
    const c = {paper:'#e9e3d6', ink:'#38392f', muted:'#87816e', green:'#69745a', blue:'#6e8990', ochre:'#ad8650', pale:'#d4cbb8'};
    const labels = {evaporation:'PLATE I · EVAPORATION',condensation:'PLATE II · CONDENSATION',precipitation:'PLATE III · PRECIPITATION',collection:'PLATE IV · COLLECTION',cycle:'THE WATER CYCLE',space:'PLATE V · THE SOLAR SYSTEM',flower:'PLATE VI · POLLINATION'};
    let scene = '';
    if (prompt.topic === 'evaporation') scene = `
      <circle cx="525" cy="103" r="38" fill="none" stroke="${c.ochre}" stroke-width="2"/><circle cx="525" cy="103" r="29" fill="${c.ochre}" opacity=".22"/>
      <path d="M24 213 148 118l95 74 102-99 112 119 79-66 80 67v49H24Z" fill="#cec7b5" stroke="${c.ink}" stroke-width="2"/><path d="m148 118 31 88m166-113 34 100m157 19 43-67" fill="none" stroke="${c.muted}" stroke-width="1.2"/>
      <path d="M24 231q75-12 150 0t150 0 150 0 142 0v54H24Z" fill="${c.blue}" opacity=".86"/><path d="M24 247q70-11 140 0t140 0 140 0 172 0M24 264q70-11 140 0t140 0 140 0 172 0" fill="none" stroke="${c.paper}" stroke-width="2" opacity=".7"/>
      <g fill="none" stroke="${c.ink}" stroke-width="2.4"><path d="M178 218V145m-6 9 6-9 6 9M312 218V130m-6 9 6-9 6 9M441 218v-69m-6 9 6-9 6 9"/></g>
      <path d="M52 293h535" stroke="${c.ink}" stroke-width="1"/><text x="52" y="313" class="small">SOLAR HEAT LIFTS WATER VAPOUR FROM THE SURFACE</text>`;
    else if (prompt.topic === 'condensation') scene = `
      <path d="M155 205c-35 0-54-24-43-52 8-21 28-30 49-24 9-41 64-53 89-21 31-14 72 2 73 37 28-3 47 17 43 39-4 21-24 31-50 31H155Z" fill="#f7f3e9" stroke="${c.ink}" stroke-width="2.5"/>
      <path d="M204 135c5-22 26-34 46-28m37 1c20-4 36 8 41 23" fill="none" stroke="${c.muted}" stroke-width="1.2"/>
      <g fill="none" stroke="${c.blue}" stroke-width="2"><path d="M178 238v52m-6-8 6 8 6-8M290 238v52m-6-8 6 8 6-8M402 238v52m-6-8 6 8 6-8"/></g>
      <g fill="${c.blue}"><circle cx="178" cy="305" r="4"/><circle cx="290" cy="305" r="4"/><circle cx="402" cy="305" r="4"/></g>
      <path d="M73 316h494" stroke="${c.ink}" stroke-width="1"/><text x="73" y="329" class="small">COOLING AIR GATHERS VAPOUR INTO CLOUD DROPLETS</text>`;
    else if (prompt.topic === 'precipitation') scene = `
      <path d="M142 152c-30-1-47-23-34-48 9-18 29-24 48-16 14-37 61-43 83-15 33-9 62 14 59 42 28 3 41 24 33 43-7 16-24 21-49 21H142Z" fill="#f7f3e9" stroke="${c.ink}" stroke-width="2.5"/>
      <g fill="none" stroke="${c.blue}" stroke-width="3"><path d="m170 209-13 33m68-33-13 33m67-33-13 33m68-33-13 33"/></g>
      <path d="M24 286 147 243l81 26 108-55 110 65 82-40 88 36v55H24Z" fill="#c9c3b2" stroke="${c.ink}" stroke-width="2"/><path d="M24 306q82-16 164 0t164 0 164 0 100 0v24H24Z" fill="${c.green}"/><path d="M310 272q12 13 0 28t0 27" fill="none" stroke="${c.blue}" stroke-width="5"/>
      <text x="45" y="326" class="small">DROPLETS GROW HEAVY AND RETURN TO THE EARTH</text>`;
    else if (prompt.topic === 'collection') scene = `
      <path d="M24 166 128 87l93 63 91-93 99 114 74-71 113 81v115H24Z" fill="#c9c2af" stroke="${c.ink}" stroke-width="2"/><path d="m128 87 30 81m154-111 27 98m172-45 25 52" fill="none" stroke="${c.muted}" stroke-width="1.2"/>
      <path d="M24 260q63-21 125 0t126 0q56-12 109 0t119 0q50-12 95 0v69H24Z" fill="${c.green}" opacity=".75"/><path d="M72 292c83-52 121 29 202-5s113 11 174-20 91 9 124-12" fill="none" stroke="${c.blue}" stroke-width="11"/><path d="M72 292c83-52 121 29 202-5s113 11 174-20 91 9 124-12" fill="none" stroke="${c.paper}" stroke-width="1.5" stroke-dasharray="3 8"/>
      <path d="M540 236v-48m-7 9 7-9 7 9" fill="none" stroke="${c.ink}" stroke-width="2"/><text x="45" y="326" class="small">RUNOFF AND GROUNDWATER RETURN WATER TO THE SEA</text>`;
    else if (prompt.topic === 'space') scene = `
      <circle cx="316" cy="210" r="40" fill="${c.ochre}" opacity=".82"/><circle cx="316" cy="210" r="31" fill="none" stroke="#f7f3e9" stroke-width="1"/>
      <ellipse cx="316" cy="210" rx="94" ry="49" fill="none" stroke="${c.ink}" stroke-width="1.2"/><ellipse cx="316" cy="210" rx="158" ry="83" fill="none" stroke="${c.ink}" stroke-width="1.2"/><ellipse cx="316" cy="210" rx="236" ry="119" fill="none" stroke="${c.ink}" stroke-width="1.2"/>
      <circle cx="409" cy="210" r="8" fill="${c.blue}" stroke="${c.ink}" stroke-width="1.2"/><circle cx="158" cy="210" r="13" fill="#a16f5c" stroke="${c.ink}" stroke-width="1.2"/><circle cx="316" cy="91" r="19" fill="#a88a70" stroke="${c.ink}" stroke-width="1.2"/><path d="M48 92h42m-21-21v42m462 31h32m-16-16v32M109 297h26m-13-13v26" stroke="${c.ochre}" stroke-width="1.5"/><text x="44" y="326" class="small">THE SUN'S GRAVITY HOLDS THE PLANETS IN ORBIT</text>`;
    else if (prompt.topic === 'flower') scene = `
      <path d="M325 316c-3-62-1-109 2-152m-2 94c-45-34-73-24-91-4 35 32 65 34 91 4Zm1-42c34-42 70-41 91-21-24 34-58 44-91 21Z" fill="none" stroke="${c.green}" stroke-width="4"/>
      <path d="M327 169c-24-19-32-40-22-58m19 58c23-23 38-43 36-67m-39 69c-3-32-1-54 10-72" fill="none" stroke="${c.ink}" stroke-width="2"/>
      <g fill="#c8b99d" stroke="${c.ink}" stroke-width="1.8"><ellipse cx="321" cy="95" rx="13" ry="32"/><ellipse cx="321" cy="95" rx="13" ry="32" transform="rotate(60 321 95)"/><ellipse cx="321" cy="95" rx="13" ry="32" transform="rotate(120 321 95)"/><ellipse cx="321" cy="95" rx="13" ry="32" transform="rotate(180 321 95)"/><ellipse cx="321" cy="95" rx="13" ry="32" transform="rotate(240 321 95)"/><ellipse cx="321" cy="95" rx="13" ry="32" transform="rotate(300 321 95)"/></g><circle cx="321" cy="95" r="13" fill="${c.ochre}" stroke="${c.ink}" stroke-width="1.5"/>
      <path d="M112 96c27-22 52-20 72-4m-43-14 8 12-14 2" fill="none" stroke="${c.ink}" stroke-width="2" stroke-dasharray="3 5"/><ellipse cx="178" cy="89" rx="16" ry="9" fill="#403d32"/><path d="M165 88q13-17 26 0m-19-8v17m11-17v17m11-13 7-8m-37 8-7-8" fill="none" stroke="${c.ink}" stroke-width="1.2"/><path d="M24 313h592m-592 8h592" stroke="${c.muted}" stroke-width="1"/><text x="45" y="327" class="small">POLLEN CARRIED BETWEEN FLOWERS BY A VISITING BEE</text>`;
    else scene = `<circle cx="320" cy="203" r="71" fill="none" stroke="${c.ink}" stroke-width="2"/><circle cx="320" cy="203" r="126" fill="none" stroke="${c.ink}" stroke-width="1.5" stroke-dasharray="3 5"/><circle cx="320" cy="203" r="185" fill="none" stroke="${c.ink}" stroke-width="1.2"/><circle cx="320" cy="203" r="29" fill="${c.ochre}"/><circle cx="445" cy="203" r="10" fill="${c.blue}" stroke="${c.ink}" stroke-width="1.5"/><circle cx="135" cy="203" r="14" fill="${c.green}" stroke="${c.ink}" stroke-width="1.5"/><path d="M45 105h65m-32-32v64m440 132h55m-27-27v54" stroke="${c.ochre}" stroke-width="2"/>`;
    const label = labels[prompt.topic];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 370" role="img" aria-label="${escape(prompt.text)}: ${label}"><defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(35)" patternUnits="userSpaceOnUse"><path d="M0 0v8" stroke="${c.ink}" stroke-width=".6" opacity=".22"/></pattern></defs><rect width="640" height="370" fill="${c.paper}"/><rect x="10" y="10" width="620" height="350" fill="none" stroke="${c.ink}" stroke-width="1"/><rect x="15" y="15" width="610" height="340" fill="none" stroke="${c.muted}" stroke-width=".5"/><text x="30" y="42" fill="${c.ink}" font-family="Georgia,serif" font-size="12" letter-spacing="2">${label}</text><path d="M30 51h580" stroke="${c.muted}" stroke-width=".7"/>${scene}<text x="30" y="342" fill="${c.ink}" font-family="Georgia,serif" font-size="9" letter-spacing=".7">NATURAL PHILOSOPHY · FIELD PLATE</text><text x="602" y="342" text-anchor="end" fill="${c.muted}" font-family="Georgia,serif" font-size="9">${prompt.topic.toUpperCase()}</text></svg>`;
  }
  function updateVisual(heading) {
    if (!heading) return;
    const prompt = compilePrompt(heading);
    headingLabel.textContent = prompt.text;
    visual.innerHTML = createImage(prompt);
    visual.setAttribute('aria-label', `Illustration for ${prompt.text}`);
    caption.textContent = `${prompt.style} · ${prompt.topic} visual`;
    nowLabel.textContent = heading.tagName === 'H2' ? 'Chapter section' : 'Now reading';
  }
  function setHeading(heading) { if (heading && heading !== lastHeading) { lastHeading = heading; updateVisual(heading); } }
  function watchHeadings() {
    if (observer) observer.disconnect();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const candidates = entries.filter(entry => entry.isIntersecting).sort((a,b) => Math.abs(a.boundingClientRect.top - innerHeight * .3) - Math.abs(b.boundingClientRect.top - innerHeight * .3));
        if (candidates.length) setHeading(candidates[0].target);
      }, {rootMargin:'-8% 0px -72% 0px', threshold:0});
      headingNodes.forEach(heading => observer.observe(heading));
    } else if (!scrollFallbackInstalled) {
      window.addEventListener('scroll', () => {
        const active = headingNodes.filter(heading => heading.getBoundingClientRect().top < innerHeight * .45).at(-1);
        setHeading(active || headingNodes[0]);
      }, {passive:true});
      scrollFallbackInstalled = true;
    }
  }

  let selectedIndex = 0;
  function selectReading(index, direction = 'forward') {
    selectedIndex = (index + cards.length) % cards.length;
    const card = cards[selectedIndex];
    cards.forEach(item => { item.classList.toggle('selected', item === card); item.setAttribute('aria-pressed', String(item === card)); });
    $('#selection-status').textContent = `Reading ${selectedIndex + 1} of ${cards.length} selected`;
    article.classList.toggle('turn-forward', direction === 'forward');
    article.classList.toggle('turn-back', direction === 'back');
    setTimeout(() => { article.classList.remove('turn-forward', 'turn-back'); }, 520);
    renderReading(readings[card.dataset.reading]);
    card.scrollIntoView?.({behavior:'smooth', block:'nearest', inline:'center'});
  }
  cards.forEach((card, index) => card.addEventListener('click', () => selectReading(index, index >= selectedIndex ? 'forward' : 'back')));
  $('#previous-reading').addEventListener('click', () => selectReading(selectedIndex - 1, 'back'));
  $('#next-reading').addEventListener('click', () => selectReading(selectedIndex + 1, 'forward'));
  $('#collapse').addEventListener('click', event => {
    const collapsed = companion.classList.toggle('collapsed');
    event.currentTarget.textContent = collapsed ? '+' : '−';
    event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    event.currentTarget.setAttribute('aria-label', collapsed ? 'Expand visual companion' : 'Collapse visual companion');
  });
  renderReading(readings.water);
})();
