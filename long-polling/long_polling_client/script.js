let currentVersion = 0;
const statusSpan = document.getElementById('task-status');
const updateBtn = document.getElementById('update-btn');
const newStatusInput = document.getElementById('new-status');
const messageDiv = document.getElementById('message');

function pollForStatus() {
  fetch(`http://localhost:3001/poll-status?last_version=${currentVersion}`)
    .then(async (response) => {
      if (response.status === 204) {
        // No change, restart polling
        pollForStatus();
        return;
      }
      if (!response.ok) throw new Error('Erreur serveur');
      const data = await response.json();
      if (data.status && typeof data.version === 'number') {
        statusSpan.textContent = data.status;
        currentVersion = data.version;
      }
      pollForStatus();
    })
    .catch(() => {
      // Network error, retry after short delay
      setTimeout(pollForStatus, 2000);
    });
}

updateBtn.addEventListener('click', () => {
  const newStatus = newStatusInput.value.trim();
  if (!newStatus) {
    messageDiv.textContent = 'Veuillez entrer un statut.';
    return;
  }
  fetch('http://localhost:3001/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      const data = await response.json();
      messageDiv.textContent = `Statut mis à jour: ${data.status}`;
      newStatusInput.value = '';
    })
    .catch(() => {
      messageDiv.textContent = 'Erreur réseau.';
    });
});

// Initial poll
pollForStatus();