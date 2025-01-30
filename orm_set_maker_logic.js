document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    const convertButton = document.querySelector('#BtmConvert');
    const clearButton = document.querySelector('#BtnClear');
    const aoSlider = document.querySelector('#toggle-ao').closest('.SliderRow').querySelector('.CustomSlider');
    aoSlider.value = 255;

    // Initialize drag and drop fields
    const dragDropFields = document.querySelectorAll('.SimpleDragDropField');

    dragDropFields.forEach((field) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png, .jpeg, .jpg, .exr, .tga';
        fileInput.style.display = 'none';
        field.appendChild(fileInput);

        field.file = null; // Attach file property to the field
        field.setAttribute('data-label', field.textContent.trim()); // Save the default label

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

    clearButton.addEventListener('click', () => {
        dragDropFields.forEach((field) => {
            field.file = null;
            field.textContent = field.getAttribute('data-label') || ''; // Reset to the default label
            field.style.borderColor = '#81807E'; // Reset border color
            console.log('[INFO] Field cleared');
        });
        progressBar.style.width = '0%'; // Reset progress bar
    });

    function handleFileSelection(field, file) {
        // Validate file type by extension as a fallback
        const validExtensions = ['png', 'jpg', 'jpeg', 'exr', 'tga'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            alert('[WARN] Invalid file type. Please select a supported image file (.png, .jpg, .exr, .tga).');
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

        // Correctly get slider values
        const useMissingAO = document.querySelector('#toggle-ao').checked;
        const missingAOValue = parseInt(document.querySelector('#toggle-ao').closest('.SliderRow').querySelector('.CustomSlider').value, 10);
        const useMissingRoughness = document.querySelector('#toggle-roughness').checked;
        const missingRoughnessValue = parseInt(document.querySelector('#toggle-roughness').closest('.SliderRow').querySelector('.CustomSlider').value, 10);
        const useMissingMetallic = document.querySelector('#toggle-metallic').checked;
        const missingMetallicValue = parseInt(document.querySelector('#toggle-metallic').closest('.SliderRow').querySelector('.CustomSlider').value, 10);

        console.log('Slider and Toggle Values:');
        console.log('AO Toggle:', useMissingAO, 'AO Value:', missingAOValue);
        console.log('Roughness Toggle:', useMissingRoughness, 'Roughness Value:', missingRoughnessValue);
        console.log('Metallic Toggle:', useMissingMetallic, 'Metallic Value:', missingMetallicValue);

        // Log attached files
        const dragDropFieldsArray = Array.from(dragDropFields);
        const albedoFile = dragDropFieldsArray[0].file;
        const normalFile = dragDropFieldsArray[1].file;
        const displacementFile = dragDropFieldsArray[2].file;
        const aoFile = dragDropFieldsArray[3].file;
        const roughnessFile = dragDropFieldsArray[4].file;
        const metallicFile = dragDropFieldsArray[5].file;

        console.log('Attached Files:');
        console.log('Albedo:', albedoFile ? albedoFile.name : 'None');
        console.log('Normal:', normalFile ? normalFile.name : 'None');
        console.log('Displacement:', displacementFile ? displacementFile.name : 'None');
        console.log('AO:', aoFile ? aoFile.name : 'None');
        console.log('Roughness:', roughnessFile ? roughnessFile.name : 'None');
        console.log('Metallic:', metallicFile ? metallicFile.name : 'None');

        const outputName = document.querySelector('#output-set-name').value || 'MyTextSet01';
        const outputSize = parseInt(document.querySelector('#output-size').value, 10) || 2048;
        const useGlossMap = document.querySelector('#toggle-usegloss').checked;

        const filesToProcess = [
            { file: albedoFile, name: `T_${outputName}_Albedo` },
            { file: normalFile, name: `T_${outputName}_Normal` },
            { file: displacementFile, name: `T_${outputName}_Displacement` },
        ].filter(item => item.file);

        const zip = new JSZip();

        for (let i = 0; i < filesToProcess.length; i++) {
            const { file, name } = filesToProcess[i];
            zip.file(`${name}.${getFileExtension(file.name)}`, file);

            // Update progress bar
            progressBar.style.width = `${((i + 1) / (filesToProcess.length + 1)) * 100}%`;
            await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing delay
        }

        if (aoFile || roughnessFile || metallicFile) {
            const ormTexture = await createOrmTexture(aoFile, roughnessFile, metallicFile, useGlossMap, outputSize);
            zip.file(`T_${outputName}_ORM.png`, ormTexture);

            // Update progress bar for ORM texture
            progressBar.style.width = `100%`;
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

        // Get the AO, Roughness, and Metallic slider values and check if their toggles are enabled
        const useMissingAO = document.querySelector('#toggle-ao').checked;
        const missingAOValue = parseInt(document.querySelector('#toggle-ao').closest('.SliderRow').querySelector('.CustomSlider').value, 10);

        const useMissingRoughness = document.querySelector('#toggle-roughness').checked;
        const missingRoughnessValue = parseInt(document.querySelector('#toggle-roughness').closest('.SliderRow').querySelector('.CustomSlider').value, 10);

        const useMissingMetallic = document.querySelector('#toggle-metallic').checked;
        const missingMetallicValue = parseInt(document.querySelector('#toggle-metallic').closest('.SliderRow').querySelector('.CustomSlider').value, 10);

        for (let i = 0; i < ormImageData.data.length; i += 4) {
            // Red channel (AO)
            if (useMissingAO) {
                // Use the AO slider value if the AO toggle is enabled
                ormImageData.data[i] = missingAOValue;
            } else {
                // Use the AO map data if available, otherwise default to 0
                ormImageData.data[i] = aoData ? aoData.data[i] : 0;
            }

            // Green channel (Roughness or Gloss)
            if (useMissingRoughness) {
                // Use the Roughness slider value if the Roughness toggle is enabled
                ormImageData.data[i + 1] = useGlossMap ? 255 - missingRoughnessValue : missingRoughnessValue;
            } else {
                // Use the Roughness map data if available, otherwise default to 0
                ormImageData.data[i + 1] = roughnessData
                    ? (useGlossMap ? 255 - roughnessData.data[i] : roughnessData.data[i])
                    : 0;
            }

            // Blue channel (Metallic)
            if (useMissingMetallic) {
                // Use the Metallic slider value if the Metallic toggle is enabled
                ormImageData.data[i + 2] = missingMetallicValue;
            } else {
                // Use the Metallic map data if available, otherwise default to 0
                ormImageData.data[i + 2] = metallicData ? metallicData.data[i] : 0;
            }

            // Alpha channel (Fully opaque)
            ormImageData.data[i + 3] = 255;
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

    function getFileExtension(fileName) {
        return fileName.split('.').pop().toLowerCase();
    }
});
