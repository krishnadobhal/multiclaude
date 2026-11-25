const keyFile = document.querySelector('#key');
const unlock = document.querySelector('#unlock');
const actions = document.querySelector('#actions');
const refresh = document.querySelector('#refresh');
const lock = document.querySelector('#lock');
const status = document.querySelector('#status');
const profiles = document.querySelector('#profiles');
let key = '';
const cli = navigator.platform.startsWith('Win') ? '.\\mc.cmd' : 'mc';

async function get(path) {
  const response = await fetch(path, {
    headers: { Authorization: 'Bearer ' + key },
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) {
    key = '';
    throw new Error('Access denied. Choose a valid access key file.');
  }
  if (!response.ok) throw new Error('Could not load sessions. Try again.');
  return response.json();
}

function renderProfile(name, ids) {
  const section = document.createElement('section');
  const header = section.appendChild(document.createElement('header'));
  header.appendChild(document.createElement('h2')).textContent = name;
  header.appendChild(document.createElement('span')).textContent =
    ids.length === 1 ? '1 running session' : `${ids.length} running sessions`;
  const list = section.appendChild(document.createElement('ul'));
  for (const id of ids) {
    const row = list.appendChild(document.createElement('li'));
    const command = `${cli} remote attach ${name} ${id}`;
    row.appendChild(document.createElement('code')).textContent = command;
    const copy = row.appendChild(document.createElement('button'));
    copy.type = 'button';
    copy.textContent = 'Copy attach command';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command);
        status.textContent = 'Attach command copied.';
      } catch {
        status.textContent = 'Select the attach command to copy it.';
      }
    });
  }
  return section;
}

async function loadSessions() {
  keyFile.disabled = refresh.disabled = lock.disabled = true;
  profiles.replaceChildren();
  status.textContent = 'Loading sessions…';
  try {
    const names = await get('/v1/profiles');
    const sections = await Promise.all(names.map(async name =>
      renderProfile(name, await get(`/v1/profiles/${encodeURIComponent(name)}/sessions`))));
    profiles.replaceChildren(...sections);
    status.textContent = names.length ? '' : 'This key has no profiles.';
  } catch (error) {
    status.textContent = error.name === 'Error' && error.message.startsWith('Access denied')
      ? error.message : 'Could not load sessions. Try again.';
  } finally {
    unlock.hidden = Boolean(key);
    actions.hidden = !key;
    keyFile.disabled = refresh.disabled = lock.disabled = false;
  }
}

keyFile.addEventListener('change', async () => {
  const file = keyFile.files[0];
  if (!file) return;
  keyFile.disabled = true;
  try {
    key = file.size <= 128 ? (await file.text()).trim() : '';
  } catch {
    key = '';
  } finally {
    keyFile.value = '';
  }
  if (/^[\w-]{43}$/.test(key)) return loadSessions();
  key = '';
  keyFile.disabled = false;
  status.textContent = 'Choose a valid multiclaude access key file.';
});

refresh.addEventListener('click', loadSessions);
lock.addEventListener('click', () => {
  key = '';
  profiles.replaceChildren();
  actions.hidden = true;
  unlock.hidden = false;
  status.textContent = '';
  keyFile.focus();
});
