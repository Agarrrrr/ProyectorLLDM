// Default Names from PDF templates to pre-populate database
        const defaultData = {
            oraciones: {
                lun: ["Oliver Pastor", "Rita Fermann", "Saúl Morales", "Santiago Mtz. R."],
                mar: ["Imer Domínguez", "Reyna Mesa", "Moisés Aguilar", "Roberto Gamboa"],
                mie: ["Mateo Aguilar", "Betzaida Cota", "Eleazar Mtz.", "Gerson Cortes"],
                jue: ["Azael Pérez", "Suri Aguilar", "Serv.", "Jassai Aguilar", "P. Doct.", "Jahir Pastor", "Edrehí Benitez"],
                vie: ["Jacob Montañez", "Marciela Lugo", "David Herrera", "Bany K. Trejo"],
                sab: ["Emiliano Pérez", "Auditorio", "Auditorio", "Auditorio"],
                dom: ["Leury Hernandez", "Auditorio", "Auditorio", "Auditorio"]
            },
            flores: [
                { dateOffset: 14, label: "Domingo 19 de Julio", names: "Margarita Navarro\nAgustín Pastor\nRomualdo Pastor\nMarícruz De la Luz\nYahir Pastor\nElizabeth Pastor\nIgnacia Pastor\nOliver Pastor" },
                { dateOffset: 21, label: "Domingo 26 de Julio", names: "Mario Aguilar\nRita Fermann\nMoisés Aguilar\nIsabel Eusquiano\nMario Aguilar\nLourdes Marquina" },
                { dateOffset: 28, label: "Domingo 2 de Agosto", names: "Jalil Bustamante\nMiguel Barajas\nVíctor Visuett\nCrescenciano Solano\nRosa Maria de la Cruz\nMerari Salgado\nFrancisca Ramirez" }
            ],
            ventas: {
                startingCycleIndex: 2 // Dom 3 (Casadas Grandes) corresponds to July 19th
            }
        };

        const rotationGroups = [
            ["Jóvenes Varones", "Jóvenes Señoritas", "Jóvenes Grandes"],
            ["Casadas Medianas"],
            ["Casadas Grandes"],
            ["Solas", "Solos", "Casados Medianos"],
            ["Casados Chicos", "Casadas Chicas"]
        ];

        let currentWeekData = {};
        let signageTimer = null;
        let currentSlideIndex = 0;

        // Helper to capitalize first letter of names (Title Case with Spanish exceptions)
        function capitalizeName(str) {
            if (!str) return '';
            
            // Keep specific keywords exactly formatted
            const valLower = str.toLowerCase().trim();
            if (valLower === "auditorio") return "Auditorio";
            if (valLower === "no hay venta") return "No hay venta";
            if (valLower === "salida a auditorio") return "Salida a Auditorio";
            if (valLower === "serv.") return "Serv.";
            if (valLower === "p. doct.") return "P. Doct.";

            const lowerWords = ["de", "la", "el", "y", "del"];
            return str.split(' ')
                      .map((word, idx) => {
                          if (word.length === 0) return '';
                          // If it is a connecting word in Spanish, keep it lowercase (unless it's the very first word)
                          if (lowerWords.includes(word.toLowerCase()) && idx > 0) {
                              return word.toLowerCase();
                          }
                          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                      })
                      .join(' ');
        }

        function capitalizeLines(str) {
            if (!str) return '';
            return str.split('\n')
                      .map(line => {
                          // If the line is an exception, keep it
                          const valLower = line.toLowerCase().trim();
                          if (valLower.includes("salida a auditorio")) return "Salida a Auditorio\nNo hay venta";
                          return capitalizeName(line.trim());
                      })
                      .join('\n');
        }

        // Initialize App on Page Load
        window.addEventListener('DOMContentLoaded', () => {
            // Set date range selection input to today (Default start of current week)
            const today = new Date();
            const startSunday = getSunday(today);
            document.getElementById('week-start').value = formatDateISO(startSunday);
            handleDateChange();
            loadHistory();
        });

        // Date Picker functions
        function getSunday(d) {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day; // diff to Sunday
            return new Date(date.setDate(diff));
        }

        function formatDateISO(date) {
            return date.toISOString().split('T')[0];
        }

        function handleDateChange() {
            const startVal = document.getElementById('week-start').value;
            if (!startVal) return;

            const startSunday = new Date(startVal + "T00:00:00");
            const endSaturday = new Date(startSunday);
            endSaturday.setDate(startSunday.getDate() + 6);
            document.getElementById('week-end').value = formatDateISO(endSaturday);

            // Attempt to load saved week from localstorage, otherwise load defaults
            const savedKey = "lldm_week_" + startVal;
            const saved = localStorage.getItem(savedKey);
            if (saved) {
                currentWeekData = JSON.parse(saved);
            } else {
                generateDefaultsFromDate(startSunday);
            }
            
            buildEditorForms();
        }

        function generateDefaultsFromDate(startSunday) {
            currentWeekData = {
                startDate: formatDateISO(startSunday),
                endDate: document.getElementById('week-end').value,
                oraciones: JSON.parse(JSON.stringify(defaultData.oraciones)),
                flores: defaultData.flores.map((f, idx) => {
                    const fDate = new Date(startSunday);
                    fDate.setDate(startSunday.getDate() + f.dateOffset);
                    return {
                        dateStr: formatDateHuman(fDate),
                        names: f.names
                    };
                }),
                ventas: {
                    startingCycleIndex: parseInt(document.getElementById('sales-starting-sunday').value)
                }
            };
        }

        function formatDateHuman(date) {
            const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            return `Domingo ${date.getDate()} de ${months[date.getMonth()]}`;
        }

        // Switch List Tabs
        function switchSectionTab(tabId, el) {
            document.querySelectorAll('.section-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.form-section-container').forEach(container => container.classList.remove('active'));
            el.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }

        // Build all Form Editor UI Inputs
        function buildEditorForms() {
            // 1. Build Oraciones Form
            const oGrid = document.getElementById('oraciones-form-grid');
            oGrid.innerHTML = '';
            
            const daysMeta = [
                { key: "lun", label: "Lunes" },
                { key: "mar", label: "Martes" },
                { key: "mie", label: "Miércoles" },
                { key: "jue", label: "Jueves", dual: true },
                { key: "vie", label: "Viernes" },
                { key: "sab", label: "Sábado" },
                { key: "dom", label: "Domingo" }
            ];

            daysMeta.forEach(day => {
                const dayCard = document.createElement('div');
                dayCard.className = 'form-day-card';
                dayCard.innerHTML = `<h4>${day.label}</h4>`;
                
                const subgroup = document.createElement('div');
                subgroup.className = 'form-subgroup';

                const oData = currentWeekData.oraciones[day.key];

                if (!day.dual) {
                    subgroup.innerHTML = `
                        <div class="form-group">
                            <label>5:00 AM</label>
                            <input type="text" id="oracion-${day.key}-5am" value="${oData[0]}">
                        </div>
                        <div class="form-group">
                            <label>9:00 AM</label>
                            <input type="text" id="oracion-${day.key}-9am" value="${oData[1]}">
                        </div>
                        <div class="form-group">
                            <label>7:00 PM</label>
                            <input type="text" id="oracion-${day.key}-7pm" value="${oData[2]}">
                        </div>
                        <div class="form-group">
                            <label>Consagración</label>
                            <input type="text" id="oracion-${day.key}-cons" value="${oData[3]}">
                        </div>
                    `;
                } else {
                    // Special layout for Jueves dual role
                    subgroup.innerHTML = `
                        <div class="form-group">
                            <label>5:00 AM</label>
                            <input type="text" id="oracion-${day.key}-5am" value="${oData[0]}">
                        </div>
                        <div class="form-group">
                            <label>9:00 AM</label>
                            <input type="text" id="oracion-${day.key}-9am" value="${oData[1]}">
                        </div>
                        <div class="form-group">
                            <label>7 PM Serv. (Nombre)</label>
                            <input type="text" id="oracion-${day.key}-7pm-n1" value="${oData[3]}">
                        </div>
                        <div class="form-group">
                            <label>7 PM P. Doct. (Nombre)</label>
                            <input type="text" id="oracion-${day.key}-7pm-n2" value="${oData[5]}">
                        </div>
                        <div class="form-group">
                            <label>Consagración</label>
                            <input type="text" id="oracion-${day.key}-cons" value="${oData[6]}">
                        </div>
                    `;
                }
                dayCard.appendChild(subgroup);
                oGrid.appendChild(dayCard);
            });

            // 2. Build Flores Form
            const fGrid = document.getElementById('flores-form-grid');
            fGrid.innerHTML = '';
            currentWeekData.flores.forEach((sunday, idx) => {
                const fCard = document.createElement('div');
                fCard.className = 'stack-item-card';
                fCard.innerHTML = `
                    <h4>Domingo ${idx + 1} de la lista</h4>
                    <div class="stack-item-grid">
                        <div class="form-group">
                            <label>Fecha del Domingo</label>
                            <input type="text" id="flores-date-${idx}" value="${sunday.dateStr}">
                        </div>
                        <div class="form-group">
                            <label>Nombres de los encargados (uno por línea)</label>
                            <textarea id="flores-names-${idx}">${sunday.names}</textarea>
                        </div>
                    </div>
                `;
                fGrid.appendChild(fCard);
            });

            // 3. Build Venta de Comida Form
            generateVentasRotation();
        }

        // Dynamically compute the 5 Sundays Food Sales Rotation based on dates & rotation index
        function generateVentasRotation() {
            const startVal = document.getElementById('week-start').value;
            if (!startVal) return;

            const startSunday = new Date(startVal + "T00:00:00");
            const startingIdx = parseInt(document.getElementById('sales-starting-sunday').value);
            
            const vGrid = document.getElementById('ventas-form-grid');
            vGrid.innerHTML = '';

            // Check if there is already saved customized sales data in currentWeekData
            if (!currentWeekData.ventas || !currentWeekData.ventas.sundays) {
                currentWeekData.ventas = {
                    startingCycleIndex: startingIdx,
                    sundays: []
                };

                // Generate 5 consecutive Sundays dates & groups
                for (let i = 0; i < 5; i++) {
                    const sDate = new Date(startSunday);
                    sDate.setDate(startSunday.getDate() + (i * 7));
                    
                    // Rotate group index
                    const rotationIdx = (startingIdx + i) % 5;
                    const defaultGroupList = rotationGroups[rotationIdx];

                    // Outlier: July 12, 2026 Outing to Auditorium (No sale)
                    const isJuly12 = (sDate.getFullYear() === 2026 && sDate.getMonth() === 6 && sDate.getDate() === 12);
                    const groupsText = isJuly12 ? "Salida a Auditorio\nNo hay venta" : defaultGroupList.join('\n');

                    currentWeekData.ventas.sundays.push({
                        dateStr: formatDateHuman(sDate),
                        shortDateStr: `${sDate.getDate()} ${getMonthShort(sDate)}`,
                        cycleLabel: `Dom ${(rotationIdx + 1)}`,
                        groups: groupsText,
                        highlight: (i === 0 && !isJuly12) // Do not highlight July 12
                    });
                }
            }

            // Render inputs
            currentWeekData.ventas.sundays.forEach((sunday, idx) => {
                const vCard = document.createElement('div');
                vCard.className = 'stack-item-card';
                vCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
                        <h4>Venta ${sunday.cycleLabel}</h4>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label style="font-size:0.75rem; font-weight:700; color:var(--admin-text-muted);">Destacar tarjeta</label>
                            <input type="checkbox" id="sales-highlight-${idx}" ${sunday.highlight ? 'checked' : ''}>
                        </div>
                    </div>
                    <div class="stack-item-grid">
                        <div class="form-group">
                            <label>Fecha</label>
                            <input type="text" id="sales-date-${idx}" value="${sunday.dateStr}">
                            <input type="hidden" id="sales-shortdate-${idx}" value="${sunday.shortDateStr}">
                            <input type="hidden" id="sales-cyclelabel-${idx}" value="${sunday.cycleLabel}">
                        </div>
                        <div class="form-group">
                            <label>Grupos encargados (uno por línea)</label>
                            <textarea id="sales-groups-${idx}">${sunday.groups}</textarea>
                        </div>
                    </div>
                `;
                vGrid.appendChild(vCard);
            });
        }

        function getMonthShort(date) {
            const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            return months[date.getMonth()];
        }

        // Harvest all current input values from DOM forms and save to currentWeekData
        function harvestFormData() {
            const startVal = document.getElementById('week-start').value;
            currentWeekData.startDate = startVal;
            currentWeekData.endDate = document.getElementById('week-end').value;

            // 1. Harvest Oraciones
            const days = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
            days.forEach(day => {
                if (day !== "jue") {
                    currentWeekData.oraciones[day] = [
                        capitalizeName(document.getElementById(`oracion-${day}-5am`).value),
                        capitalizeName(document.getElementById(`oracion-${day}-9am`).value),
                        capitalizeName(document.getElementById(`oracion-${day}-7pm`).value),
                        capitalizeName(document.getElementById(`oracion-${day}-cons`).value)
                    ];
                } else {
                    currentWeekData.oraciones[day] = [
                        capitalizeName(document.getElementById(`oracion-${day}-5am`).value),
                        capitalizeName(document.getElementById(`oracion-${day}-9am`).value),
                        "Serv.",
                        capitalizeName(document.getElementById(`oracion-${day}-7pm-n1`).value),
                        "P. Doct.",
                        capitalizeName(document.getElementById(`oracion-${day}-7pm-n2`).value),
                        capitalizeName(document.getElementById(`oracion-${day}-cons`).value)
                    ];
                }
            });

            // 2. Harvest Flores
            currentWeekData.flores.forEach((sunday, idx) => {
                sunday.dateStr = capitalizeName(document.getElementById(`flores-date-${idx}`).value);
                sunday.names = capitalizeLines(document.getElementById(`flores-names-${idx}`).value);
            });

            // 3. Harvest Ventas
            currentWeekData.ventas.sundays.forEach((sunday, idx) => {
                sunday.dateStr = capitalizeName(document.getElementById(`sales-date-${idx}`).value);
                sunday.groups = capitalizeLines(document.getElementById(`sales-groups-${idx}`).value);
                sunday.highlight = document.getElementById(`sales-highlight-${idx}`).checked;
            });
        }

        // Save Week to LocalStorage
        function saveCurrentWeek() {
            harvestFormData();
            buildEditorForms(); // Refresh textboxes with capitalized letters
            const key = "lldm_week_" + currentWeekData.startDate;
            localStorage.setItem(key, JSON.stringify(currentWeekData));
            alert("¡Semana guardada correctamente en el historial local!");
            loadHistory();
        }

        // Load history of saved weeks in sidebar
        function loadHistory() {
            const list = document.getElementById('saved-weeks-list');
            list.innerHTML = '';
            
            // Loop through LocalStorage keys
            let savedWeeks = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith("lldm_week_")) {
                    savedWeeks.push(key.replace("lldm_week_", ""));
                }
            }

            // Sort dates descending
            savedWeeks.sort().reverse();

            if (savedWeeks.length === 0) {
                list.innerHTML = `<li style="font-size:0.75rem; color:var(--admin-text-muted); text-align:center;">No hay semanas guardadas.</li>`;
                return;
            }

            savedWeeks.forEach(dateStr => {
                const item = document.createElement('li');
                item.className = 'history-item';
                item.innerHTML = `
                    <span onclick="loadWeekFromHistory('${dateStr}')" style="display:flex; align-items:center; gap:6px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="svg-icon" style="width:12px; height:12px; color:var(--admin-gold);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Semana: ${dateStr}
                    </span>
                    <span class="delete-history" onclick="deleteWeekFromHistory('${dateStr}', event)" style="display:inline-flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="svg-icon" style="width:13px; height:13px; color:#EF4444;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </span>
                `;
                list.appendChild(item);
            });
        }

        function loadWeekFromHistory(dateStr) {
            document.getElementById('week-start').value = dateStr;
            handleDateChange();
        }

        function deleteWeekFromHistory(dateStr, event) {
            event.stopPropagation();
            if (confirm(`¿Estás seguro de eliminar la semana ${dateStr} del historial?`)) {
                localStorage.removeItem("lldm_week_" + dateStr);
                loadHistory();
            }
        }

        // ----------------------------------------------------
        // DYNAMIC HTML TEMPLATE COMPILING FOR Loop/Download
        // ----------------------------------------------------

        // Generate dynamic HTML for Oraciones Vertical (9:16)
        function getOracionesVerticalHTML(data) {
            return `
                <div class="flyer-container" id="f-orac-v" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 576px; height: 1024px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 1.5rem 1rem 1.2rem 1rem; text-align: center; border-bottom: 4px solid #B7922F; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <div class="header-logo-container" style="display: flex; align-items: center; justify-content: center; gap: 0.8rem; width: 100%;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 55px; height: 55px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="display: flex; flex-direction: column; align-items: center;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.75rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.1rem;">ORACIONES</h1>
                            </div>
                        </div>
                        <div class="header-date-badge" style="display: inline-block; background: linear-gradient(135deg, #9B824A, #B7922F); color: #FFFFFF; padding: 0.3rem 1.2rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; border-radius: 50px; text-transform: uppercase; margin-top: 0.2rem;">Semana: ${formatDateBadge(data.startDate)}</div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 0.6rem; display: flex; flex-direction: column; background-color: #FFFFFF;">
                        <table class="schedule-table" style="width: 100%; height: 100%; border-collapse: collapse; border: 1.5px solid #9B824A;">
                            <thead>
                                <tr style="background-color: #0A1931; color: #DDCD72;">
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 800; padding: 0.8rem 0.3rem;">Día</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 800; padding: 0.8rem 0.3rem;">5 AM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 800; padding: 0.8rem 0.3rem;">9 AM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 800; padding: 0.8rem 0.3rem;">7 PM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 0.95rem; font-weight: 800; padding: 0.8rem 0.3rem;">Consagr.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderTableRows(data.oraciones)}
                            </tbody>
                        </table>
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.8rem 1rem; text-align: center; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 32px; height: 32px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        // Generate dynamic HTML for Oraciones Horizontal (16:9) - FOR DOWNLOADS
        function getOracionesHorizontalHTML(data) {
            return `
                <div class="flyer-container" id="f-orac-h" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 1024px; height: 576px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 0.8rem 1.5rem; border-bottom: 4px solid #B7922F; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div class="header-left" style="display: flex; align-items: center; gap: 1rem;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 50px; height: 50px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="text-align: left;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.2rem; line-height: 1;">ORACIONES</h1>
                            </div>
                        </div>
                        <div class="header-date-badge" style="background: linear-gradient(135deg, #9B824A, #B7922F); color: #FFFFFF; padding: 0.4rem 1.5rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; border-radius: 50px; text-transform: uppercase; white-space: nowrap;">Semana: ${formatDateBadge(data.startDate)}</div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 0.5rem; display: flex; flex-direction: column; background-color: #FFFFFF;">
                        <table class="schedule-table" style="width: 100%; height: 100%; border-collapse: collapse; border: 1.5px solid #9B824A;">
                            <thead>
                                <tr style="background-color: #0A1931; color: #DDCD72;">
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 800; padding: 0.4rem 0.2rem;">Día</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 800; padding: 0.4rem 0.2rem;">5 AM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 800; padding: 0.4rem 0.2rem;">9 AM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 800; padding: 0.4rem 0.2rem;">7 PM</th>
                                    <th style="border: 1px solid #9B824A; font-family: 'Cinzel', serif; font-size: 1.35rem; font-weight: 800; padding: 0.4rem 0.2rem;">Consagr.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderTableRowsHorizontal(data.oraciones)}
                            </tbody>
                        </table>
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.5rem 1.5rem; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 25px; height: 25px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        // Generate dynamic HTML for Oraciones 5 AM - SIGNAGE TV EXCLUSIVE
        function getSignageOraciones5AMHTML(data) {
            return `
                <div class="signage-container" style="width: 100%; height: 100%; background-color: #FFFFFF; display: flex; flex-direction: column;">
                    <header style="background-color: #0A1931; height: 15%; display: flex; align-items: center; justify-content: center; border-bottom: 1vh solid #B7922F;">
                        <h1 style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 8vh; font-weight: 800; letter-spacing: 0.05em; margin: 0;">ORACIONES 5:00 AM</h1>
                    </header>
                    <table style="width: 100%; height: 85%; border-collapse: collapse; border: none; table-layout: fixed;">
                        <thead>
                            <tr style="background-color: #0A1931; color: #DDCD72; height: 10%;">
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 6vh; font-weight: 800; width: 25%;">Día</th>
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 6vh; font-weight: 800;">Encargado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderSignageOraciones5AMRows(data.oraciones)}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Generate dynamic HTML for Oraciones 9 AM - SIGNAGE TV EXCLUSIVE
        function getSignageOraciones9AMHTML(data) {
            return `
                <div class="signage-container" style="width: 100%; height: 100%; background-color: #FFFFFF; display: flex; flex-direction: column;">
                    <header style="background-color: #0A1931; height: 15%; display: flex; align-items: center; justify-content: center; border-bottom: 1vh solid #B7922F;">
                        <h1 style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 8vh; font-weight: 800; letter-spacing: 0.05em; margin: 0;">ORACIONES 9:00 AM</h1>
                    </header>
                    <table style="width: 100%; height: 85%; border-collapse: collapse; border: none; table-layout: fixed;">
                        <thead>
                            <tr style="background-color: #0A1931; color: #DDCD72; height: 10%;">
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 6vh; font-weight: 800; width: 25%;">Día</th>
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 6vh; font-weight: 800;">Encargado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderSignageOraciones9AMRows(data.oraciones)}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Generate dynamic HTML for Oraciones Tarde - SIGNAGE TV EXCLUSIVE
        function getSignageOracionesTardeHTML(data) {
            return `
                <div class="signage-container" style="width: 100%; height: 100%; background-color: #FFFFFF; display: flex; flex-direction: column;">
                    <header style="background-color: #0A1931; height: 15%; display: flex; align-items: center; justify-content: center; border-bottom: 1vh solid #B7922F;">
                        <h1 style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 8vh; font-weight: 800; letter-spacing: 0.05em; margin: 0;">ORACIONES POR LA TARDE</h1>
                    </header>
                    <table style="width: 100%; height: 85%; border-collapse: collapse; border: none; table-layout: fixed;">
                        <thead>
                            <tr style="background-color: #0A1931; color: #DDCD72; height: 10%;">
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 5vh; font-weight: 800; width: 20%;">Día</th>
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 5vh; font-weight: 800;">7:00 PM</th>
                                <th style="border: 2px solid #9B824A; font-family: 'Cinzel', serif; font-size: 5vh; font-weight: 800;">Consagración</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderSignageOracionesTardeRows(data.oraciones)}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function renderSignageOraciones5AMRows(o) {
            const days = [
                { l: 'Lunes', k: 'lun' },
                { l: 'Martes', k: 'mar' },
                { l: 'Miércoles', k: 'mie' },
                { l: 'Jueves', k: 'jue' },
                { l: 'Viernes', k: 'vie' },
                { l: 'Sábado', k: 'sab' },
                { l: 'Domingo', k: 'dom' }
            ];

            return days.map((d, index) => {
                const cells = o[d.k];
                const val = cells[0];
                const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F9F7F1';
                const rowStyle = `background-color: ${rowBg}; height: 12.8%;`;
                const cStyle = val.toLowerCase().includes("auditorio") ? 'font-family: \\'Playfair Display\\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';

                return `
                    <tr style="${rowStyle}">
                        <td style="border: 2px solid #9B824A; border-right: 3px solid #9B824A; font-family: 'Cinzel', serif; font-weight: 800; color: #0A1931; background-color: #ECE8DB; font-size: 7vh; text-align: center;">${d.l}</td>
                        <td style="border: 2px solid #D9D4C2; padding: 0.5vh; font-size: 8vh; font-weight: 800; text-align: center; line-height: 1.1; ${cStyle}">${val}</td>
                    </tr>
                `;
            }).join('');
        }

        function renderSignageOraciones9AMRows(o) {
            const days = [
                { l: 'Lunes', k: 'lun' },
                { l: 'Martes', k: 'mar' },
                { l: 'Miércoles', k: 'mie' },
                { l: 'Jueves', k: 'jue' },
                { l: 'Viernes', k: 'vie' },
                { l: 'Sábado', k: 'sab' },
                { l: 'Domingo', k: 'dom' }
            ];

            return days.map((d, index) => {
                const cells = o[d.k];
                const val = cells[1];
                const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F9F7F1';
                const rowStyle = `background-color: ${rowBg}; height: 12.8%;`;
                const cStyle = val.toLowerCase().includes("auditorio") ? 'font-family: \\'Playfair Display\\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';

                return `
                    <tr style="${rowStyle}">
                        <td style="border: 2px solid #9B824A; border-right: 3px solid #9B824A; font-family: 'Cinzel', serif; font-weight: 800; color: #0A1931; background-color: #ECE8DB; font-size: 7vh; text-align: center;">${d.l}</td>
                        <td style="border: 2px solid #D9D4C2; padding: 0.5vh; font-size: 8vh; font-weight: 800; text-align: center; line-height: 1.1; ${cStyle}">${val}</td>
                    </tr>
                `;
            }).join('');
        }

        function renderSignageOracionesTardeRows(o) {
            const days = [
                { l: 'Lunes', k: 'lun', dual: false },
                { l: 'Martes', k: 'mar', dual: false },
                { l: 'Miércoles', k: 'mie', dual: false },
                { l: 'Jueves', k: 'jue', dual: true },
                { l: 'Viernes', k: 'vie', dual: false },
                { l: 'Sábado', k: 'sab', dual: false },
                { l: 'Domingo', k: 'dom', dual: false }
            ];

            return days.map((d, index) => {
                const cells = o[d.k];
                const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F9F7F1';
                const rowStyle = `background-color: ${rowBg}; height: 12.8%;`;

                const valCons = cells[d.dual ? 6 : 3];
                const cConsStyle = valCons.toLowerCase().includes("auditorio") ? 'font-family: \\'Playfair Display\\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';

                let cell7PM = '';
                if (!d.dual) {
                    const val7PM = cells[2];
                    const c7PMStyle = val7PM.toLowerCase().includes("auditorio") ? 'font-family: \\'Playfair Display\\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                    cell7PM = `<td style="border: 2px solid #D9D4C2; padding: 0.5vh; font-size: 7vh; font-weight: 800; text-align: center; line-height: 1.1; ${c7PMStyle}">${val7PM}</td>`;
                } else {
                    cell7PM = `
                        <td style="border: 2px solid #D9D4C2; vertical-align: middle; padding: 0.5vh; text-align: center;">
                            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%;">
                                <div style="display: flex; align-items: baseline; justify-content: center; gap: 1vw;">
                                    <span style="font-size: 3.5vh; font-weight: 800; color: #B7922F; text-transform: uppercase;">${cells[2]}</span>
                                    <span style="font-weight: 800; color: #0F121C; font-size: 5vh; line-height: 1;">${cells[3]}</span>
                                </div>
                                <div style="width: 80%; height: 2px; background-color: #D9D4C2; margin: 0.5vh auto;"></div>
                                <div style="display: flex; align-items: baseline; justify-content: center; gap: 1vw;">
                                    <span style="font-size: 3.5vh; font-weight: 800; color: #B7922F; text-transform: uppercase;">${cells[4]}</span>
                                    <span style="font-weight: 800; color: #0F121C; font-size: 5vh; line-height: 1;">${cells[5]}</span>
                                </div>
                            </div>
                        </td>
                    `;
                }

                return `
                    <tr style="${rowStyle}">
                        <td style="border: 2px solid #9B824A; border-right: 3px solid #9B824A; font-family: 'Cinzel', serif; font-weight: 800; color: #0A1931; background-color: #ECE8DB; font-size: 6vh; text-align: center;">${d.l}</td>
                        ${cell7PM}
                        <td style="border: 2px solid #D9D4C2; padding: 0.5vh; font-size: 7vh; font-weight: 800; text-align: center; line-height: 1.1; ${cConsStyle}">${valCons}</td>
                    </tr>
                `;
            }).join('');
        }
        
        // Signage Flores
        function getSignageFloresHTML(data) {
            return `
                <div class="signage-container" style="width: 100%; height: 100%; background-color: #FAF7EE; display: flex; flex-direction: column;">
                    <header style="background-color: #0A1931; height: 15%; display: flex; align-items: center; justify-content: center; border-bottom: 1vh solid #B7922F;">
                        <h1 style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 8vh; font-weight: 800; letter-spacing: 0.05em; margin: 0;">LISTA DE FLORES</h1>
                    </header>
                    <main style="flex: 1; padding: 2vh 4vw; display: flex; gap: 3vw; justify-content: center; align-items: stretch; background-color: #FFFFFF;">
                        ${data.flores.map(f => `
                            <div style="flex: 1; border: 0.4vh solid #D9D4C2; border-radius: 2vh; overflow: hidden; display: flex; flex-direction: column; background: #FAFAFA; box-shadow: 0 1vh 2vh rgba(0,0,0,0.05);">
                                <div style="background-color: #ECE8DB; padding: 2vh; text-align: center; border-bottom: 0.4vh solid #9B824A;">
                                    <h2 style="font-family: 'Cinzel', serif; color: #0A1931; font-size: 4vh; margin: 0; font-weight: 800;">${f.dateStr}</h2>
                                </div>
                                <div style="padding: 3vh; flex: 1; display: flex; align-items: center; justify-content: center;">
                                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2.5vh; width: 100%;">
                                        ${f.names.map(name => `
                                            <li style="font-size: 5vh; font-weight: 700; color: #0F121C; display: flex; align-items: center; gap: 1.5vw; line-height: 1.2;">
                                                <div style="width: 1.5vh; height: 1.5vh; background-color: #B7922F; border-radius: 50%; flex-shrink: 0;"></div>
                                                ${name}
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        `).join('')}
                    </main>
                </div>
            `;
        }

        // Signage Ventas
        function getSignageVentasHTML(data) {
            return `
                <div class="signage-container" style="width: 100%; height: 100%; background-color: #FAF7EE; display: flex; flex-direction: column;">
                    <header style="background-color: #0A1931; height: 15%; display: flex; align-items: center; justify-content: center; border-bottom: 1vh solid #B7922F;">
                        <h1 style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 8vh; font-weight: 800; letter-spacing: 0.05em; margin: 0;">VENTA DE COMIDA</h1>
                    </header>
                    <main style="flex: 1; padding: 4vh 6vw; display: flex; flex-direction: column; gap: 3vh; background-color: #FFFFFF;">
                        ${data.ventas.groups.map(g => `
                            <div style="border: 0.4vh solid #D9D4C2; border-radius: 2vh; overflow: hidden; display: flex; align-items: stretch; background: #FAFAFA; box-shadow: 0 1vh 2vh rgba(0,0,0,0.05); min-height: 14vh;">
                                <div style="width: 40%; background-color: #ECE8DB; border-right: 0.4vh solid #9B824A; display: flex; align-items: center; justify-content: center; padding: 2vh;">
                                    <h2 style="font-family: 'Cinzel', serif; color: #0A1931; font-size: 4.5vh; margin: 0; font-weight: 800; text-align: center; line-height: 1.1;">${g.dateStr}</h2>
                                </div>
                                <div style="width: 60%; padding: 2vh 4vw; display: flex; align-items: center;">
                                    <div style="width: 100%; text-align: center;">
                                        ${g.exception ? `
                                            <div style="font-family: 'Playfair Display', serif; font-style: italic; color: #B7922F; font-size: 6vh; font-weight: 800; line-height: 1.2;">
                                                ${g.names[0].replace('\n', '<br>')}
                                            </div>
                                        ` : g.names.map(name => `
                                            <div style="font-size: 6vh; font-weight: 800; color: #0F121C; line-height: 1.2; text-transform: uppercase;">
                                                ${name}
                                            </div>
                                        `).join(`
                                            <div style="width: 40%; height: 0.4vh; background-color: #D9D4C2; margin: 1.5vh auto;"></div>
                                        `)}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </main>
                </div>
            `;
        }

        function renderTableRows(o) {
            const days = [
                { k: "lun", l: "Lun" },
                { k: "mar", l: "Mar" },
                { k: "mie", l: "Mié" },
                { k: "jue", l: "Jue", dual: true },
                { k: "vie", l: "Vie" },
                { k: "sab", l: "Sáb" },
                { k: "dom", l: "Dom" }
            ];

            return days.map(d => {
                const isEven = (d.k === "mar" || d.k === "jue" || d.k === "sab");
                const rowStyle = isEven ? 'background-color: #FAF9F4;' : 'background-color: #FFFFFF;';
                const cells = o[d.k];

                const c1Style = cells[0].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c2Style = cells[1].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c3Style = (!d.dual && cells[2].toLowerCase().includes("auditorio")) ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c4Style = cells[d.dual ? 6 : 3].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';

                let cell3 = '';
                if (!d.dual) {
                    cell3 = `<td style="border: 1px solid #D9D4C2; padding: 0.5rem 0.3rem; font-size: 0.92rem; font-weight: 600; text-align: center; ${c3Style}">${cells[2]}</td>`;
                } else {
                    cell3 = `
                        <td class="dual-role" style="border: 1px solid #D9D4C2; vertical-align: middle; padding: 0.4rem 0.2rem; text-align: center;">
                            <div>
                                <span class="role-label" style="font-size: 0.65rem; font-weight: 800; color: #B7922F; text-transform: uppercase; display: block;">${cells[2]}</span>
                                <span class="role-name" style="font-weight: 700; color: #0F121C; display: block;">${cells[3]}</span>
                            </div>
                            <div class="divider-line" style="width: 80%; height: 1px; background-color: #D9D4C2; margin: 2px auto;"></div>
                            <div>
                                <span class="role-label" style="font-size: 0.65rem; font-weight: 800; color: #B7922F; text-transform: uppercase; display: block;">${cells[4]}</span>
                                <span class="role-name" style="font-weight: 700; color: #0F121C; display: block;">${cells[5]}</span>
                            </div>
                        </td>
                    `;
                }

                return `
                    <tr style="${rowStyle}">
                        <td class="day-name" style="border: 1px solid #9B824A; border-right: 2px solid #9B824A; font-family: 'Cinzel', serif; font-weight: 800; color: #0A1931; background-color: #ECE8DB; font-size: 0.95rem; text-align: center; padding: 0.5rem 0.3rem;">${d.l}</td>
                        <td style="border: 1px solid #D9D4C2; padding: 0.5rem 0.3rem; font-size: 0.92rem; font-weight: 600; text-align: center; ${c1Style}">${cells[0]}</td>
                        <td style="border: 1px solid #D9D4C2; padding: 0.5rem 0.3rem; font-size: 0.92rem; font-weight: 600; text-align: center; ${c2Style}">${cells[1]}</td>
                        ${cell3}
                        <td style="border: 1px solid #D9D4C2; padding: 0.5rem 0.3rem; font-size: 0.92rem; font-weight: 600; text-align: center; ${c4Style}">${cells[d.dual ? 6 : 3]}</td>
                    </tr>
                `;
            }).join('');
        }

        function renderTableRowsHorizontal(o) {
            const days = [
                { k: "lun", l: "Lun" },
                { k: "mar", l: "Mar" },
                { k: "mie", l: "Mié" },
                { k: "jue", l: "Jue", dual: true },
                { k: "vie", l: "Vie" },
                { k: "sab", l: "Sáb" },
                { k: "dom", l: "Dom" }
            ];

            return days.map(d => {
                const isEven = (d.k === "mar" || d.k === "jue" || d.k === "sab");
                const rowStyle = isEven ? 'background-color: #FAF9F4;' : 'background-color: #FFFFFF;';
                const cells = o[d.k];

                const c1Style = cells[0].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c2Style = cells[1].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c3Style = (!d.dual && cells[2].toLowerCase().includes("auditorio")) ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';
                const c4Style = cells[d.dual ? 6 : 3].toLowerCase().includes("auditorio") ? 'font-family: \'Playfair Display\', serif; font-style: italic; color: #B7922F; font-weight: 700;' : 'color: #0F121C;';

                let cell3 = '';
                if (!d.dual) {
                    cell3 = `<td style="border: 1px solid #D9D4C2; padding: 0.2rem 0.2rem; font-size: 1.55rem; font-weight: 800; text-align: center; ${c3Style}">${cells[2]}</td>`;
                } else {
                    cell3 = `
                        <td class="dual-role" style="border: 1px solid #D9D4C2; vertical-align: middle; padding: 0.1rem 0.1rem; text-align: center;">
                            <div class="role-wrapper" style="display: inline-block; vertical-align: middle;">
                                <span class="role-label" style="font-size: 0.9rem; font-weight: 800; color: #B7922F; text-transform: uppercase; display: block; line-height: 1; margin-bottom: 1px;">${cells[2]}</span>
                                <span class="role-name" style="font-weight: 800; color: #0F121C; display: block; line-height: 1.1; font-size: 1.25rem;">${cells[3]}</span>
                            </div>
                            <div class="divider-line" style="width: 80%; height: 1px; background-color: #D9D4C2; margin: 0.1rem auto;"></div>
                            <div class="role-wrapper" style="display: inline-block; vertical-align: middle;">
                                <span class="role-label" style="font-size: 0.9rem; font-weight: 800; color: #B7922F; text-transform: uppercase; display: block; line-height: 1; margin-bottom: 1px;">${cells[4]}</span>
                                <span class="role-name" style="font-weight: 800; color: #0F121C; display: block; line-height: 1.1; font-size: 1.25rem;">${cells[5]}</span>
                            </div>
                        </td>
                    `;
                }

                return `
                    <tr style="${rowStyle}">
                        <td class="day-name" style="border: 1px solid #9B824A; border-right: 2px solid #9B824A; font-family: 'Cinzel', serif; font-weight: 800; color: #0A1931; background-color: #ECE8DB; font-size: 1.55rem; text-align: center; padding: 0.2rem 0.2rem;">${d.l}</td>
                        <td style="border: 1px solid #D9D4C2; padding: 0.2rem 0.2rem; font-size: 1.55rem; font-weight: 800; text-align: center; ${c1Style}">${cells[0]}</td>
                        <td style="border: 1px solid #D9D4C2; padding: 0.2rem 0.2rem; font-size: 1.55rem; font-weight: 800; text-align: center; ${c2Style}">${cells[1]}</td>
                        ${cell3}
                        <td style="border: 1px solid #D9D4C2; padding: 0.2rem 0.2rem; font-size: 1.55rem; font-weight: 800; text-align: center; ${c4Style}">${cells[d.dual ? 6 : 3]}</td>
                    </tr>
                `;
            }).join('');
        }

        function getFloresVerticalHTML(data) {
            return `
                <div class="flyer-container" id="f-flor-v" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 576px; height: 1024px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 1.5rem 1rem 1.2rem 1rem; text-align: center; border-bottom: 4px solid #B7922F; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <div class="header-logo-container" style="display: flex; align-items: center; justify-content: center; gap: 0.8rem; width: 100%;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 55px; height: 55px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="display: flex; flex-direction: column; align-items: center;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.75rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.1rem;">LISTA DE FLORES</h1>
                            </div>
                        </div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-evenly; background-color: #FFFFFF;">
                        ${renderFlowerCards(data.flores, false)}
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.8rem 1rem; text-align: center; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 32px; height: 32px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        // Generate dynamic HTML for Flores Horizontal (16:9)
        function getFloresHorizontalHTML(data) {
            return `
                <div class="flyer-container" id="f-flor-h" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 1024px; height: 576px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 0.8rem 1.5rem; border-bottom: 4px solid #B7922F; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div class="header-left" style="display: flex; align-items: center; gap: 1rem;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 50px; height: 50px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="text-align: left;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.2rem; line-height: 1;">LISTA DE FLORES</h1>
                            </div>
                        </div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 1rem 1.2rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; align-items: stretch; background-color: #FFFFFF;">
                        ${renderFlowerCards(data.flores, true)}
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.5rem 1.5rem; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 25px; height: 25px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        function renderFlowerCards(flores, isHorizontal) {
            const flowerBulletSVG = `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: #B7922F; flex-shrink: 0;"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M6,12A2,2 0 0,1 8,10A2,2 0 0,1 10,12A2,2 0 0,1 8,14A2,2 0 0,1 6,12M12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20M18,12A2,2 0 0,1 16,14A2,2 0 0,1 14,12A2,2 0 0,1 16,10A2,2 0 0,1 18,12Z"/></svg>`;
            
            return flores.map(f => {
                const namesArray = f.names.split('\n').filter(n => n.trim() !== '');
                
                let listItems = '';
                if (!isHorizontal) {
                    listItems = namesArray.map(name => `
                        <li style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 700; color: #0F121C; padding: 0.3rem 0; border-bottom: 1px dashed rgba(155, 130, 74, 0.15);">${flowerBulletSVG} ${name.trim()}</li>
                    `).join('');
                } else {
                    listItems = namesArray.map(name => `
                        <li style="display: flex; align-items: center; gap: 0.4rem; font-size: 1.55rem; font-weight: 800; color: #0F121C; padding: 0.25rem 0; border-bottom: 1px dashed rgba(155, 130, 74, 0.15); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${flowerBulletSVG} ${name.trim()}</li>
                    `).join('');
                }

                const listPadding = isHorizontal ? 'padding: 0.5rem 0.8rem;' : 'padding: 0.6rem 1rem;';
                const gridLayout = (!isHorizontal) ? 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem 1rem;' : 'display: flex; flex-direction: column; justify-content: space-evenly; flex: 1;';
                
                return `
                    <div class="date-card" style="background-color: #FAF7EE; border: 1.5px solid #D9D4C2; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                        <div class="card-header" style="background-color: #0A1931; color: #DDCD72; padding: 0.6rem 1rem; text-align: center; font-family: 'Cinzel', serif; font-size: ${isHorizontal ? '1.6rem' : '1.1rem'}; font-weight: 800; letter-spacing: 0.05em; border-bottom: 2.5px solid #B7922F; text-transform: uppercase;">${f.dateStr}</div>
                        <ul class="names-list" style="list-style: none; ${listPadding} ${gridLayout}">
                            ${listItems}
                        </ul>
                    </div>
                `;
            }).join('');
        }

        // Generate dynamic HTML for Ventas Vertical (9:16)
        function getVentasVerticalHTML(data) {
            return `
                <div class="flyer-container" id="f-vent-v" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 576px; height: 1024px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 1.5rem 1rem 1.2rem 1rem; text-align: center; border-bottom: 4px solid #B7922F; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        <div class="header-logo-container" style="display: flex; align-items: center; justify-content: center; gap: 0.8rem; width: 100%;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 55px; height: 55px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="display: flex; flex-direction: column; align-items: center;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.1rem;">VENTA DE COMIDA</h1>
                            </div>
                        </div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 0.8rem 1rem; display: flex; flex-direction: column; justify-content: space-between; background-color: #FFFFFF;">
                        ${renderVentasCards(data.ventas.sundays, false)}
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.8rem 1rem; text-align: center; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 32px; height: 32px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        // Generate dynamic HTML for Ventas Horizontal (16:9)
        function getVentasHorizontalHTML(data) {
            return `
                <div class="flyer-container" id="f-vent-h" style="border: 8px solid #9B824A; background-color: #FAF7EE; display: flex; flex-direction: column; width: 1024px; height: 576px; box-shadow: none;">
                    <header class="header" style="background-color: #0A1931; padding: 0.8rem 1.5rem; border-bottom: 4px solid #B7922F; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div class="header-left" style="display: flex; align-items: center; gap: 1rem;">
                            <img class="official-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 50px; height: 50px; object-fit: contain;">
                            <div class="header-titles-wrapper" style="text-align: left;">
                                <div class="header-subtitle" style="font-family: 'Montserrat', sans-serif; color: #DDCD72; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1;">La Luz del Mundo</div>
                                <h1 class="header-title" style="font-family: 'Cinzel', serif; color: #FFFFFF; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.2rem; line-height: 1;">VENTA DE COMIDA</h1>
                            </div>
                        </div>
                        <div class="header-date-badge" style="background: linear-gradient(135deg, #9B824A, #B7922F); color: #FFFFFF; padding: 0.4rem 1.5rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; border-radius: 50px; text-transform: uppercase; white-space: nowrap;">Rotación de Grupos</div>
                    </header>
                    <main class="content-area" style="flex: 1; padding: 0.8rem 1.2rem; display: flex; flex-direction: column; justify-content: space-around; gap: 0.6rem; background-color: #FFFFFF;">
                        <!-- Row 1: Sundays 3, 4, 5 -->
                        <div class="cards-row row-3-cards" style="display: flex; justify-content: center; gap: 1.2rem; width: 100%; height: 44%;">
                            ${renderVentasCardsHorizontalRow(data.ventas.sundays.slice(0, 3))}
                        </div>
                        <!-- Row 2: Sundays 1, 2 -->
                        <div class="cards-row row-2-cards" style="display: flex; justify-content: center; gap: 1.2rem; width: 100%; height: 44%;">
                            ${renderVentasCardsHorizontalRow(data.ventas.sundays.slice(3, 5))}
                        </div>
                    </main>
                    <footer class="footer" style="background-color: #0A1931; padding: 0.5rem 1.5rem; border-top: 4px solid #B7922F; display: flex; align-items: center; justify-content: center; gap: 0.8rem;">
                        <img class="footer-logo" src="data:image/png;base64,${getLogoBase64()}" style="width: 25px; height: 25px; object-fit: contain;">
                        <div class="footer-text" style="color: #FFFFFF; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">100 AÑOS DE <span style="color: #DDCD72; font-weight: 800;">ESPERANZA Y SALVACIÓN</span></div>
                    </footer>
                </div>
            `;
        }

        function renderVentasCards(sundays, isHorizontal) {
            return sundays.map(s => {
                const groupItems = s.groups.split('\n').filter(g => g.trim() !== '');
                const highlightStyle = s.highlight ? 'border: 2px solid #B7922F; box-shadow: 0 6px 15px rgba(183, 146, 47, 0.15); background-color: #FFFDF0;' : 'background-color: #FAF7EE; border: 1.5px solid #D9D4C2;';
                const dateSideStyle = s.highlight ? 'background: linear-gradient(135deg, #0A1931 60%, #9B824A);' : 'background-color: #0A1931;';

                const groupListHtml = groupItems.map((group, idx) => {
                    const inlineStyle = groupItems.length > 1 ? 'font-size: 1.15rem; margin-bottom: 2px;' : 'font-size: 1.3rem;';
                    return `
                        <div class="group-name" style="font-weight: 800; color: #0F121C; line-height: 1.2; display: flex; align-items: flex-start; gap: 6px; ${inlineStyle}">
                            <span class="bullet-dot" style="width: 6px; height: 6px; background-color: #B7922F; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-top: 8px;"></span>
                            ${group.trim()}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="date-card" style="border-radius: 6px; overflow: hidden; display: flex; flex-direction: row; align-items: center; height: 17%; ${highlightStyle}">
                        <div class="card-date-side" style="color: #FFFFFF; width: 35%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0.5rem; border-right: 3px solid #B7922F; text-align: center; ${dateSideStyle}">
                            <span class="day-label" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #DDCD72; letter-spacing: 0.1em; margin-bottom: 2px;">Domingo</span>
                            <span class="date-text" style="font-size: 1.55rem; font-weight: 800; line-height: 1.1;">${s.shortDateStr}</span>
                        </div>
                        <div class="card-group-side" style="flex: 1; padding: 0.5rem 1rem; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px;">
                            ${groupListHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderVentasCardsHorizontalRow(sundays) {
            return sundays.map(s => {
                const groupItems = s.groups.split('\n').filter(g => g.trim() !== '');
                const highlightStyle = s.highlight ? 'border: 2px solid #B7922F; box-shadow: 0 6px 15px rgba(183, 146, 47, 0.15); background-color: #FFFDF0;' : 'background-color: #FAF7EE; border: 1.5px solid #D9D4C2;';
                const dateSideStyle = s.highlight ? 'background: linear-gradient(135deg, #0A1931 60%, #9B824A);' : 'background-color: #0A1931;';

                const groupListHtml = groupItems.map((group, idx) => {
                    let inlineStyle = 'font-size: 1.85rem;';
                    if (groupItems.length > 1) {
                        inlineStyle = 'font-size: 1.5rem; margin-bottom: 2px;';
                    }
                    return `
                        <div class="group-name" style="font-weight: 700; color: #0F121C; line-height: 1.2; display: flex; align-items: flex-start; gap: 5px; width: 100%; ${inlineStyle}">
                            <span class="bullet-dot" style="width: 5px; height: 5px; background-color: #B7922F; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-top: 6px;"></span>
                            ${group.trim()}
                        </div>
                    `;
                }).join('');

                const cardWidth = sundays.length === 3 ? 'width: 31%;' : 'width: 38%;';

                return `
                    <div class="date-card" style="border-radius: 8px; overflow: hidden; display: flex; flex-direction: row; align-items: center; height: 100%; ${cardWidth} ${highlightStyle}">
                        <div class="card-date-side" style="color: #FFFFFF; width: 35%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0.4rem; border-right: 3px solid #B7922F; text-align: center; ${dateSideStyle}">
                            <span class="day-label" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #DDCD72; letter-spacing: 0.1em; margin-bottom: 2px;">Domingo</span>
                            <span class="date-text" style="font-size: 1.6rem; font-weight: 800; line-height: 1.1;">${s.shortDateStr}</span>
                        </div>
                        <div class="card-group-side" style="flex: 1; padding: 0.4rem 0.8rem; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; overflow: hidden;">
                            ${groupListHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function formatDateBadge(dateStr) {
            // Converts YYYY-MM-DD to DD/MM
            const parts = dateStr.split('-');
            if (parts.length < 3) return dateStr;
            return `${parts[2]}/${parts[1]}`;
        }

        // Return Base64 of logo (Reused from what we loaded in PowerShell)
        function getLogoBase64() {
            // Get base64 string from header logo src attribute
            const img = document.querySelector('header.admin-header img');
            if (img && img.src.includes('base64,')) {
                return img.src.split('base64,')[1];
            }
            // Fallback (this is the actual base64 of the logo we just embedded)
            return "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~";
        }

        // ----------------------------------------------------
        // FULL SCREEN SIGNAGE CONTROLLER & TIMER
        // ----------------------------------------------------

        function startSignage() {
            // 1. Harvest form data first to ensure latest edits are shown in slides
            harvestFormData();
            
            // 2. Render NATIVE 100vh frames inside signage slides (replaces fixed px renders)
            document.getElementById('frame-oraciones').innerHTML = getSignageOracionesHTML(currentWeekData);
            document.getElementById('frame-flores').innerHTML = getSignageFloresHTML(currentWeekData);
            document.getElementById('frame-ventas').innerHTML = getSignageVentasHTML(currentWeekData);

            // 3. Open signage player full screen
            const player = document.getElementById('signage-player');
            player.style.display = 'block';
            
            // Allow OBS to capture full window without fullscreen prompt
            if (player.requestFullscreen) {
                player.requestFullscreen().catch(err => {
                    console.log("Fullscreen request denied by browser (likely OBS). Continuing in windowed mode.");
                });
            }

            // 4. Disable manual scaling & auto-fit since we now use vh units!
            // setTimeout(() => { resizeSignage(); adjustSignageFonts(); }, 80);

            // 5. Start slideshow interval (loops every 15 seconds)
            currentSlideIndex = 0;
            resetSlidesClasses();
            
            clearInterval(signageTimer);
            signageTimer = setInterval(nextSignageSlide, 15000); // 15 seconds loop interval
        }

        function resizeSignage() {
            const player = document.getElementById('signage-player');
            const frames = player.querySelectorAll('.flyer-container');
            if (frames.length === 0) return;
            const scaleX = window.innerWidth / 1024;
            const scaleY = window.innerHeight / 576;
            frames.forEach(frame => {
                frame.style.transform = `scale(${scaleX}, ${scaleY})`;
                frame.style.transformOrigin = 'top left';
                frame.style.width = '1024px';
                frame.style.height = '576px';
                frame.style.position = 'absolute';
                frame.style.top = '0';
                frame.style.left = '0';
                frame.style.border = 'none';
            });
        }
        window.addEventListener('resize', () => {
            // Disabled manual scaling: vh handles everything automatically now
            // resizeSignage();
            // adjustSignageFonts();
        });

        // Dynamic Font Fitting engine to prevent text overflow at monolithic font sizes
        function adjustSignageFonts() {
            const player = document.getElementById('signage-player');
            if (!player) return;

            // 1. Auto-fit Oraciones Table to content area height
            const container = player.querySelector('#frame-oraciones .content-area');
            const table = player.querySelector('#frame-oraciones .schedule-table');
            if (container && table) {
                const cellTexts = table.querySelectorAll('td, th, .role-label, .role-name');
                cellTexts.forEach(c => c.style.fontSize = ''); // Reset to default
                
                let attempts = 0;
                while (table.scrollHeight > container.clientHeight + 6 && attempts < 35) {
                    let tooSmall = false;
                    cellTexts.forEach(c => {
                        let currentSize = parseFloat(window.getComputedStyle(c).fontSize);
                        
                        // Giant Floor limits for TV legibility
                        let minLimit = 30; // 30px floor (~1.88rem) for main cells
                        if (c.classList.contains('role-label')) {
                            minLimit = 16; // 16px floor for Thursday labels (Serv. / P. Doct.)
                        } else if (c.classList.contains('role-name')) {
                            minLimit = 22; // 22px floor for Thursday names
                        }
                        
                        if (currentSize <= minLimit) {
                            tooSmall = true;
                        } else {
                            c.style.fontSize = (currentSize - 0.5) + 'px';
                        }
                    });
                    if (tooSmall) break;
                    attempts++;
                }
            }

            // 2. Auto-fit Card lists (Flores & Ventas) to card boundaries
            const cards = player.querySelectorAll('.date-card');
            cards.forEach(card => {
                const groupSide = card.querySelector('.card-group-side');
                const namesList = card.querySelector('.names-list');
                
                if (groupSide) {
                    const groupNames = groupSide.querySelectorAll('.group-name');
                    groupNames.forEach(gn => gn.style.fontSize = ''); // Reset
                    
                    let attempts = 0;
                    while (card.scrollHeight > card.clientHeight + 6 && attempts < 30) {
                        let tooSmall = false;
                        groupNames.forEach(gn => {
                            let currentSize = parseFloat(window.getComputedStyle(gn).fontSize);
                            const minLimit = groupNames.length > 1 ? 22 : 28; // Min limit 22px for multiple, 28px for single
                            if (currentSize <= minLimit) {
                                tooSmall = true;
                            } else {
                                gn.style.fontSize = (currentSize - 0.5) + 'px';
                            }
                        });
                        if (tooSmall) break;
                        attempts++;
                    }
                }
                
                if (namesList) {
                    const items = namesList.querySelectorAll('li');
                    items.forEach(it => it.style.fontSize = ''); // Reset
                    
                    let attempts = 0;
                    while (card.scrollHeight > card.clientHeight + 6 && attempts < 30) {
                        let tooSmall = false;
                        items.forEach(it => {
                            let currentSize = parseFloat(window.getComputedStyle(it).fontSize);
                            if (currentSize <= 24) { // strict minimum limit of 24px (~1.5rem) for flower names
                                tooSmall = true;
                            } else {
                                it.style.fontSize = (currentSize - 0.5) + 'px';
                            }
                        });
                        if (tooSmall) break;
                        attempts++;
                    }
                }
            });
        }

        function resetSlidesClasses() {
            const slides = [
                document.getElementById('slide-oraciones'),
                document.getElementById('slide-flores'),
                document.getElementById('slide-ventas')
            ];
            
            slides.forEach((slide, idx) => {
                slide.className = 'signage-slide'; // clear classes
                if (idx === currentSlideIndex) {
                    slide.classList.add('active');
                } else if (idx === (currentSlideIndex + 1) % 3) {
                    slide.classList.add('next');
                } else {
                    slide.classList.add('prev');
                }
            });
        }

        function nextSignageSlide() {
            currentSlideIndex = (currentSlideIndex + 1) % 3;
            
            // Perform beautiful 3D cube rotation transition
            const slides = [
                document.getElementById('slide-oraciones'),
                document.getElementById('slide-flores'),
                document.getElementById('slide-ventas')
            ];

            // Transition logic using CSS preserve-3d
            const activeSlide = slides[currentSlideIndex];
            const prevSlide = slides[(currentSlideIndex - 1 + 3) % 3];
            const nextSlide = slides[(currentSlideIndex + 1) % 3];

            // Trigger animation
            slides.forEach(slide => {
                slide.classList.remove('active', 'next', 'prev');
            });

            activeSlide.classList.add('active');
            nextSlide.classList.add('next');
            prevSlide.classList.add('prev');
        }

        function exitSignage() {
            clearInterval(signageTimer);
            document.getElementById('signage-player').style.display = 'none';
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }

        // Listen for Esc key to exit fullscreen signage player
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                exitSignage();
            }
        });

        // ----------------------------------------------------
        // 4K ZIP ZIPPER & EXPORTER WITH HTML2CANVAS
        // ----------------------------------------------------

        async function downloadAllFlyersZip() {
            harvestFormData();
            buildEditorForms(); // Refresh textboxes with capitalized letters
            
            const btn = document.querySelector('.download-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="svg-icon" style="animation: spin 1.5s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></svg> Compilando ZIP 4K...';
            btn.disabled = true;

            const renderArea = document.getElementById('offscreen-render-area');
            renderArea.innerHTML = ''; // Reset offscreen area

            // Append all 6 flyers to the offscreen area
            renderArea.innerHTML = `
                <!-- 1. Oraciones Vertical -->
                <div id="v-oraciones-render">${getOracionesVerticalHTML(currentWeekData)}</div>
                <!-- 2. Oraciones Horizontal -->
                <div id="h-oraciones-render">${getOracionesHorizontalHTML(currentWeekData)}</div>
                <!-- 3. Flores Vertical -->
                <div id="v-flores-render">${getFloresVerticalHTML(currentWeekData)}</div>
                <!-- 4. Flores Horizontal -->
                <div id="h-flores-render">${getFloresHorizontalHTML(currentWeekData)}</div>
                <!-- 5. Ventas Vertical -->
                <div id="v-ventas-render">${getVentasVerticalHTML(currentWeekData)}</div>
                <!-- 6. Ventas Horizontal -->
                <div id="h-ventas-render">${getVentasHorizontalHTML(currentWeekData)}</div>
            `;

            // Wait a brief moment for browser layout rendering engine
            await new Promise(resolve => setTimeout(resolve, 300));

            const zip = new JSZip();

            try {
                // Render Oraciones Vertical (Target Width: 2160px)
                const vOracionesEl = document.getElementById('f-orac-v');
                const vOracionesCanvas = await html2canvas(vOracionesEl, {
                    scale: 2160 / vOracionesEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobOracV = await getCanvasBlob(vOracionesCanvas);
                zip.file("1_oraciones_vertical_4k.png", blobOracV);

                // Render Oraciones Horizontal (Target Width: 3840px)
                const hOracionesEl = document.getElementById('f-orac-h');
                const hOracionesCanvas = await html2canvas(hOracionesEl, {
                    scale: 3840 / hOracionesEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobOracH = await getCanvasBlob(hOracionesCanvas);
                zip.file("2_oraciones_horizontal_4k.png", blobOracH);

                // Render Flores Vertical (Target Width: 2160px)
                const vFloresEl = document.getElementById('f-flor-v');
                const vFloresCanvas = await html2canvas(vFloresEl, {
                    scale: 2160 / vFloresEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobFlorV = await getCanvasBlob(vFloresCanvas);
                zip.file("3_flores_vertical_4k.png", blobFlorV);

                // Render Flores Horizontal (Target Width: 3840px)
                const hFloresEl = document.getElementById('f-flor-h');
                const hFloresCanvas = await html2canvas(hFloresEl, {
                    scale: 3840 / hFloresEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobFlorH = await getCanvasBlob(hFloresCanvas);
                zip.file("4_flores_horizontal_4k.png", blobFlorH);

                // Render Ventas Vertical (Target Width: 2160px)
                const vVentasEl = document.getElementById('f-vent-v');
                const vVentasCanvas = await html2canvas(vVentasEl, {
                    scale: 2160 / vVentasEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobVentV = await getCanvasBlob(vVentasCanvas);
                zip.file("5_ventas_vertical_4k.png", blobVentV);

                // Render Ventas Horizontal (Target Width: 3840px)
                const hVentasEl = document.getElementById('f-vent-h');
                const hVentasCanvas = await html2canvas(hVentasEl, {
                    scale: 3840 / hVentasEl.offsetWidth,
                    useCORS: true,
                    logging: false
                });
                const blobVentH = await getCanvasBlob(hVentasCanvas);
                zip.file("6_ventas_horizontal_4k.png", blobVentH);

                // Generate ZIP Archive
                const zipContent = await zip.generateAsync({type:"blob"});
                
                // Create browser download trigger
                const link = document.createElement('a');
                link.download = `paquete_carteleria_4k_${currentWeekData.startDate}.zip`;
                link.href = URL.createObjectURL(zipContent);
                link.click();

            } catch (err) {
                console.error("ZIP packaging error:", err);
                alert("Error al compilar y empaquetar las imágenes en 4K.");
            } finally {
                // Cleanup offscreen render area
                renderArea.innerHTML = '';
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        // Helper to convert canvas element to Blob
        function getCanvasBlob(canvas) {
            return new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
        }