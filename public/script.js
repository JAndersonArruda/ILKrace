document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.blob())
    .then(blob => {
        const imgUrl = URL.createObjectURL(blob);
        const imgElement = document.getElementById('resultImage');
        imgElement.src = imgUrl;
        imgElement.style.display = 'block';
    })
    .catch(error => console.error('Erro:', error));
});
