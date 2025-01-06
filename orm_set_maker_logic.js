document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    const convertButton = document.querySelector('.BtnDefault');

    // Initialize drag and drop fields
    const dragDropFields = document.querySelectorAll('.SimpleDragDropField');

    dragDropFields.forEach((field) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png, image/jpeg';
        fileInput.style.display = 'none';
        field.appendChild(fileInput);

        field.file = null; // Attach file property to the field

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

        // Handle drag-and-drop functionality
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

            const file = event.dataTransfer.files[0];
            if (file) {
                handleFileSelection(field, file);
            }
        });
    });

    function handleFileSelection(field, file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg'];
        if (!validTypes.includes(file.type)) {
            alert('[WARN] Invalid file type. Please select an image file.');
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

    // Initialize sliders and toggles
    const sliderRows = document.querySelectorAll('.SliderRow');

    sliderRows.forEach(row => {
        const toggle = row.querySelector('.ToggleInput');
        const slider = row.querySelector('.CustomSlider');
        const popup = document.createElement('div');

        // Style for popup
        popup.style.position = 'absolute';
        popup.style.backgroundColor = '#1A1A1A';
        popup.style.color = '#FFFFFF';
        popup.style.padding = '4px 8px';
        popup.style.borderRadius = '4px';
        popup.style.display = 'none';
        popup.style.zIndex = '1000';

        row.appendChild(popup);

        toggle.addEventListener('change', () => {
            slider.disabled = !toggle.checked;
        });

        slider.addEventListener('input', () => {
            const rect = slider.getBoundingClientRect();
            popup.style.left = `${rect.left + (slider.value / slider.max) * rect.width}px`;
            popup.style.top = `${rect.top - 25}px`;
            popup.textContent = slider.value;
            popup.style.display = 'block';
        });

        slider.addEventListener('mouseleave', () => {
            popup.style.display = 'none';
        });
    });

    convertButton.addEventListener('click', async () => {
        console.log('[INFO] Conversion Started');

        const outputName = document.querySelector('#output-set-name').value || 'MyTextSet01';
        const outputSize = parseInt(document.querySelector('#output-size').value, 10) || 2048;
        const useGlossMap = document.querySelector('#toggle-usegloss').checked;

        const dragDropFieldsArray = Array.from(dragDropFields);
        const albedoFile = dragDropFieldsArray[0].file;
        const normalFile = dragDropFieldsArray[1].file;
        const displacementFile = dragDropFieldsArray[2].file;
        const aoFile = dragDropFieldsArray[3].file;
        const roughnessFile = dragDropFieldsArray[4].file;
        const metallicFile = dragDropFieldsArray[5].file;

        const filesToProcess = [albedoFile, aoFile, roughnessFile, metallicFile, normalFile, displacementFile].filter(Boolean);
        const processedFiles = [];

        for (let i = 0; i < filesToProcess.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // Simulating processing delay
            processedFiles.push(filesToProcess[i]);
            progressBar.style.width = `${((i + 1) / filesToProcess.length) * 100}%`;
        }

        console.log('[INFO] Packing into ZIP');

        const zip = new JSZip();
        if (albedoFile) {
            zip.file(`T_${outputName}_Albedo.png`, albedoFile);
        }
        if (aoFile || roughnessFile || metallicFile) {
            const ormTexture = await createOrmTexture(aoFile, roughnessFile, metallicFile, useGlossMap, outputSize);
            zip.file(`T_${outputName}_ORM.png`, ormTexture);
        }
        if (normalFile) {
            zip.file(`T_${outputName}_Normal.png`, normalFile);
        }
        if (displacementFile) {
            zip.file(`T_${outputName}_Displacement.png`, displacementFile);
        }

        zip.generateAsync({ type: 'blob' }).then((blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `T_${outputName}.zip`;
            link.click();

            console.log('[INFO] Download Complete');
        });
    });

    async function createOrmTexture(aoFile, roughnessFile, metallicFile, useGlossMap, outputSize) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = outputSize;

        const aoData = aoFile ? await readImageData(aoFile, outputSize) : null;
        const roughnessData = roughnessFile ? await readImageData(roughnessFile, outputSize) : null;
        const metallicData = metallicFile ? await readImageData(metallicFile, outputSize) : null;

        const ormImageData = ctx.createImageData(outputSize, outputSize);

        for (let i = 0; i < ormImageData.data.length; i += 4) {
            ormImageData.data[i] = aoData ? aoData.data[i] : 0; // Red - AO
            ormImageData.data[i + 1] = roughnessData
                ? (useGlossMap ? 255 - roughnessData.data[i] : roughnessData.data[i])
                : 0; // Green - Roughness or Gloss
            ormImageData.data[i + 2] = metallicData ? metallicData.data[i] : 0; // Blue - Metallic
            ormImageData.data[i + 3] = 255; // Alpha - Fully opaque
        }

        ctx.putImageData(ormImageData, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    }

    async function readImageData(file, size) {
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
});
