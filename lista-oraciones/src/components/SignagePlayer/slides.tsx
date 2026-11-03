import type { WeekData, OracionesData } from '../../types';

export const renderOraciones5AM = (data: WeekData) => {
  const allDays: { l: string; k: keyof OracionesData }[] = [
    { l: 'Lunes', k: 'lun' }, { l: 'Martes', k: 'mar' }, { l: 'Miércoles', k: 'mie' },
    { l: 'Jueves', k: 'jue' }, { l: 'Viernes', k: 'vie' }, { l: 'Sábado', k: 'sab' }, { l: 'Domingo', k: 'dom' }
  ];
  const filledDays = allDays.filter(d => {
    const arr = data.oraciones[d.k];
    return Array.isArray(arr) && arr[0]?.trim() !== '';
  });
  const days = filledDays.length > 0 ? filledDays : allDays;

  return (
    <div className="signage-container" style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #F8F6EF 0%, #FFFFFF 100%)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg, #0A1931 0%, #152844 60%, #1a3358 100%)', height: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5vh solid #B7922F', boxShadow: '0 0.18518519vh 1.1111111vh rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontFamily: '"Outfit", sans-serif', color: '#FFFFFF', fontSize: '8vh', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ORACIONES <span style={{ color: '#DDCD72' }}>5:00 AM</span></h1>
      </header>
      <table style={{ width: '100%', height: '85%', borderCollapse: 'collapse', border: 'none', tableLayout: 'fixed' }}>
        <tbody>
          {days.map((d, index) => {
            const arr = data.oraciones[d.k];
            const val = Array.isArray(arr) ? (arr[0] || '') : '';
            const rowStyle = { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F7F1', height: `${100 / days.length}%` };
            const cStyle = val.toLowerCase().includes("auditorio")
              ? { fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#B7922F', fontWeight: 700 }
              : { color: '#0F121C', fontFamily: '"Inter", sans-serif' };
            return (
              <tr style={rowStyle} key={d.k}>
                <td style={{ border: '0.18518519vh solid #9B824A', borderRight: '0.27777778vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: '#0A1931', background: 'linear-gradient(135deg, #ECE8DB, #E0DAC8)', fontSize: '7vh', textAlign: 'center', width: '28%' }}>{d.l}</td>
                <td style={{ border: '0.18518519vh solid #D9D4C2', padding: '0.5vh', fontSize: '8vh', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, ...cStyle }}>{val}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const renderOraciones9AM = (data: WeekData) => {
  const allDays: { l: string; k: keyof OracionesData }[] = [
    { l: 'Lunes', k: 'lun' }, { l: 'Martes', k: 'mar' }, { l: 'Miércoles', k: 'mie' },
    { l: 'Jueves', k: 'jue' }, { l: 'Viernes', k: 'vie' }, { l: 'Sábado', k: 'sab' }
  ];
  const filledDays = allDays.filter(d => {
    const arr = data.oraciones[d.k];
    return Array.isArray(arr) && arr[1]?.trim() !== '';
  });
  const days = filledDays.length > 0 ? filledDays : allDays;
  const hasEncargada = Boolean(data.oraciones.encargada9AM?.trim());

  return (
    <div className="signage-container" style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #F8F6EF 0%, #FFFFFF 100%)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg, #0A1931 0%, #152844 60%, #1a3358 100%)', height: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5vh solid #B7922F', boxShadow: '0 0.18518519vh 1.1111111vh rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontFamily: '"Outfit", sans-serif', color: '#FFFFFF', fontSize: '8vh', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ORACIONES <span style={{ color: '#DDCD72' }}>9:00 AM</span></h1>
      </header>
      <table style={{ width: '100%', height: '85%', borderCollapse: 'collapse', border: 'none', tableLayout: 'fixed' }}>
        {hasEncargada && (
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #152844, #0A1931)', color: '#DDCD72', height: '12%' }}>
              <th style={{ border: '0.18518519vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontSize: '6vh', fontWeight: 800, width: '25%' }}>Día</th>
              <th style={{ border: '0.18518519vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontSize: '5.5vh', fontWeight: 800 }}>Encargada: {data.oraciones.encargada9AM}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {days.map((d, index) => {
            const arr = data.oraciones[d.k];
            const val = Array.isArray(arr) ? (arr[1] || '') : '';
            const rowStyle = { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F7F1', height: `${(hasEncargada ? 88 : 100) / days.length}%` };
            const cStyle = val.toLowerCase().includes("auditorio")
              ? { fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#B7922F', fontWeight: 700 }
              : { color: '#0F121C' };
            return (
              <tr style={rowStyle} key={d.k}>
                <td style={{ border: '0.18518519vh solid #9B824A', borderRight: '0.27777778vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: '#0A1931', background: 'linear-gradient(135deg, #ECE8DB, #E0DAC8)', fontSize: '7vh', textAlign: 'center', width: '25%' }}>{d.l}</td>
                <td style={{ border: '0.18518519vh solid #D9D4C2', padding: '0.5vh', fontSize: '8vh', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, ...cStyle }}>{val}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const renderOracionesTarde = (data: WeekData) => {
  const allDays: { l: string; k: keyof OracionesData; dual: boolean }[] = [
    { l: 'Domingo', k: 'dom_ini', dual: true },
    { l: 'Lunes', k: 'lun', dual: false },
    { l: 'Martes', k: 'mar', dual: false },
    { l: 'Miércoles', k: 'mie', dual: false },
    { l: 'Jueves', k: 'jue', dual: true },
    { l: 'Viernes', k: 'vie', dual: false },
    { l: 'Sábado', k: 'sab', dual: false },
    { l: 'Domingo', k: 'dom', dual: true }
  ];

  const filledDays = allDays.filter(d => {
    const c = data.oraciones[d.k];
    if (!Array.isArray(c)) return false;
    if (d.dual) return c[3]?.trim() !== '' || c[5]?.trim() !== '' || c[6]?.trim() !== '';
    return c[2]?.trim() !== '' || c[3]?.trim() !== '';
  });
  const days = filledDays.length > 0 ? filledDays : allDays.slice(1, 7);

  return (
    <div className="signage-container" style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #F8F6EF 0%, #FFFFFF 100%)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg, #0A1931 0%, #152844 60%, #1a3358 100%)', height: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5vh solid #B7922F', boxShadow: '0 0.18518519vh 1.1111111vh rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontFamily: '"Outfit", sans-serif', color: '#FFFFFF', fontSize: '8vh', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ORACIONES <span style={{ color: '#DDCD72' }}>POR LA TARDE</span></h1>
      </header>
      <table style={{ width: '100%', height: '85%', borderCollapse: 'collapse', border: 'none', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #152844, #0A1931)', color: '#DDCD72', height: '10%' }}>
            <th style={{ border: '0.18518519vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontSize: '5vh', fontWeight: 800, width: '20%' }}>Día</th>
            <th style={{ border: '0.18518519vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontSize: '5vh', fontWeight: 800 }}>Tarde</th>
            <th style={{ border: '0.18518519vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontSize: '5vh', fontWeight: 800 }}>Consagración</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, index) => {
            const rawCells = data.oraciones[d.k];
            const cells = Array.isArray(rawCells) ? rawCells : (d.dual ? ["", "", "", "", "", "", ""] : ["", "", "", ""]);
            const valCons = cells[d.dual ? 6 : 3] || '';
            const rowStyle = { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F7F1', height: `${90 / days.length}%` };
            const cConsStyle = valCons.toLowerCase().includes("auditorio")
              ? { fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#B7922F', fontWeight: 700 }
              : { color: '#0F121C', fontFamily: '"Inter", sans-serif' };

            let cell7PM;
            if (!d.dual) {
              const val7PM = cells[2] || '';
              const c7PMStyle = val7PM.toLowerCase().includes("auditorio")
                ? { fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#B7922F', fontWeight: 700 }
                : { color: '#0F121C', fontFamily: '"Inter", sans-serif' };
              cell7PM = <td style={{ border: '0.18518519vh solid #D9D4C2', padding: '0.5vh', fontSize: '6.5vh', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, ...c7PMStyle }}>{val7PM}</td>;
            } else {
              cell7PM = (
                <td style={{ border: '0.18518519vh solid #D9D4C2', verticalAlign: 'middle', padding: '0.5vh', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                    {cells[3]?.trim() !== '' && (
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1vw' }}>
                        <span style={{ fontSize: '3.2vh', fontWeight: 800, color: '#B7922F', textTransform: 'uppercase' }}>{cells[2] || 'Servicio'}</span>
                        <span style={{ fontWeight: 800, color: '#0F121C', fontFamily: '"Inter", sans-serif', fontSize: '4.6vh', lineHeight: 1 }}>{cells[3]}</span>
                      </div>
                    )}
                    {cells[3]?.trim() !== '' && cells[5]?.trim() !== '' && (
                      <div style={{ width: '80%', height: '0.18518519vh', backgroundColor: '#D9D4C2', margin: '0.4vh auto' }}></div>
                    )}
                    {cells[5]?.trim() !== '' && (
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1vw' }}>
                        <span style={{ fontSize: '3.2vh', fontWeight: 800, color: '#B7922F', textTransform: 'uppercase' }}>{cells[4] || 'P. Doct.'}</span>
                        <span style={{ fontWeight: 800, color: '#0F121C', fontFamily: '"Inter", sans-serif', fontSize: '4.6vh', lineHeight: 1 }}>{cells[5]}</span>
                      </div>
                    )}
                  </div>
                </td>
              );
            }

            return (
              <tr style={rowStyle} key={d.k}>
                <td style={{ border: '0.18518519vh solid #9B824A', borderRight: '0.27777778vh solid #9B824A', fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: '#0A1931', background: 'linear-gradient(135deg, #ECE8DB, #E0DAC8)', fontSize: '5.5vh', textAlign: 'center' }}>{d.l}</td>
                {cell7PM}
                <td style={{ border: '0.18518519vh solid #D9D4C2', padding: '0.5vh', fontSize: '6.5vh', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, ...cConsStyle }}>{valCons}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
