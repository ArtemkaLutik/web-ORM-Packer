// JavaScript for ORM Texture Packer

document.addEventListener('DOMContentLoaded', () => {
    // Toggle behavior for sliders
    const toggles = document.querySelectorAll('.ToggleInput');

    toggles.forEach(toggle => {
        toggle.addEventListener('change', (event) => {
            const slider = event.target.closest('.SliderRow').querySelector('.CustomSlider');
            slider.disabled = !event.target.checked;
            slider.value = slider.disabled ? 0 : slider.value; // Reset value to 0 when disabled
        });
    });

    // Convert button functionality
    const convertButton = document.querySelector('.BtnDefault');
    convertButton.addEventListener('click', async () => {
        console.log('[INFO] Conversion Started');

        const aoFile = document.querySelector('.SimpleDragDropField:nth-child(1)').file;
        const roughnessFile = document.querySelector('.SimpleDragDropField:nth-child(2)').file;
        const metallicFile = document.querySelector('.SimpleDragDropField:nth-child(3)').file;

        const aoToggle = document.querySelector('#toggle-ao').checked;
        const roughnessToggle = document.querySelector('#toggle-roughness').checked;
        const metallicToggle = document.querySelector('#toggle-metallic').checked;

        const aoValue = aoToggle ? parseInt(document.querySelector('.SliderRow:nth-child(1) .CustomSlider').value, 10) : 0;
        const roughnessValue = roughnessToggle ? parseInt(document.querySelector('.SliderRow:nth-child(2) .CustomSlider').value, 10) : 0;
        const metallicValue = metallicToggle ? parseInt(document.querySelector('.SliderRow:nth-child(3) .CustomSlider').value, 10) : 0;

        const outputSize = parseInt(document.querySelector('#output-size').value, 10);
        const outputSetName = document.querySelector('#output-set-name').value || 'ORMTexture';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = outputSize;

        const aoImageData = aoFile && !aoToggle ? await readImage(aoFile, outputSize) : null;
        const roughnessImageData = roughnessFile && !roughnessToggle ? await readImage(roughnessFile, outputSize) : null;
        const metallicImageData = metallicFile && !metallicToggle ? await readImage(metallicFile, outputSize) : null;

        const outputImageData = ctx.createImageData(outputSize, outputSize);

        for (let i = 0; i < outputImageData.data.length; i += 4) {
            outputImageData.data[i] = aoToggle || !aoImageData ? aoValue : aoImageData.data[i]; // Red - AO
            outputImageData.data[i + 1] = roughnessToggle || !roughnessImageData ? roughnessValue : roughnessImageData.data[i]; // Green - Roughness
            outputImageData.data[i + 2] = metallicToggle || !metallicImageData ? metallicValue : metallicImageData.data[i]; // Blue - Metallic
            outputImageData.data[i + 3] = 255; // Alpha - Fully opaque
        }

        ctx.putImageData(outputImageData, 0, 0);

        const link = document.createElement('a');
        link.download = `${outputSetName}.png`;
        link.href = canvas.toDataURL();
        link.click();

        console.log('[INFO] Conversion Complete');
    });

    // Handle drag-and-drop functionality
    const dragDropFields = document.querySelectorAll('.SimpleDragDropField');

    dragDropFields.forEach(field => {
        // Add input element for file selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png, image/jpeg';
        fileInput.style.display = 'none';
        field.appendChild(fileInput);

        field.file = null; // Attach file property to field

        // Handle clicking on the field to choose a file
        field.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                handleFileSelection(field, file);
            }
        });

        // Prevent default behavior for drag events
        field.addEventListener('dragover', (event) => {
            event.preventDefault();
            field.style.borderColor = '#CE7D63'; // Highlight border
        });

        field.addEventListener('dragleave', () => {
            field.style.borderColor = '#81807E'; // Reset border
        });

        field.addEventListener('drop', (event) => {
            event.preventDefault();
            field.style.borderColor = '#81807E'; // Reset border

            // Get the dropped file
            const file = event.dataTransfer.files[0];
            if (file) {
                handleFileSelection(field, file);
            }
        });
    });

    function handleFileSelection(field, file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('[WARN] Invalid file type. Please drop or choose an image file.');
            return;
        }

        // Attach the file to the field
        field.file = file;

        // Update the field with the file name
        field.textContent = file.name;
        field.style.textOverflow = 'ellipsis'; // Handle long file names
        field.style.overflow = 'hidden';
        field.style.whiteSpace = 'nowrap';

        console.log(`[INFO] File selected: ${file.name}`);

        // Add animation
        field.style.transform = 'scale(0.8)';
        setTimeout(() => {
            field.style.transform = 'scale(1)';
            field.style.transition = 'transform 0.3s ease';
        }, 100);
    }

    async function readImage(file, size) {
        const img = new Image();
        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = () => {
                img.src = reader.result;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = canvas.height = size;

                ctx.drawImage(img, 0, 0, size, size);
                resolve(ctx.getImageData(0, 0, size, size));
            };

            reader.readAsDataURL(file);
        });
    }

    // Add slider value pop-up
    const sliders = document.querySelectorAll('.CustomSlider');

    sliders.forEach(slider => {
        const valuePopup = document.createElement('div');
        valuePopup.classList.add('SliderValuePopup');
        valuePopup.style.position = 'absolute';
        valuePopup.style.backgroundColor = '#CE7D63';
        valuePopup.style.color = '#FFFFFF';
        valuePopup.style.padding = '4px 8px';
        valuePopup.style.borderRadius = '4px';
        valuePopup.style.fontSize = '12px';
        valuePopup.style.transform = 'translate(-50%, -120%)';
        valuePopup.style.display = 'none';
        valuePopup.style.zIndex = '10';
        slider.parentElement.appendChild(valuePopup);

        slider.addEventListener('input', () => {
            const rect = slider.getBoundingClientRect();
            valuePopup.style.left = `${rect.left + (slider.offsetWidth * (slider.value - slider.min) / (slider.max - slider.min))}px`;
            valuePopup.style.top = `${rect.top - 20}px`;
            valuePopup.textContent = slider.value;
            valuePopup.style.display = 'block';
        });

        slider.addEventListener('mouseleave', () => {
            valuePopup.style.display = 'none';
        });

        slider.addEventListener('blur', () => {
            valuePopup.style.display = 'none';
        });
    });
});
