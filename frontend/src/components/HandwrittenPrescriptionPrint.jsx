const HandwrittenPrescriptionPrint = ({ rx }) => {
  if (!rx) return null;

  const p = rx.patient || {};

  return (
    <div className="print-root">
      <div className="print-page">

        <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
          Gonoshasthaya Samaj Vittik Medical College
        </h3>
        <p style={{ textAlign: "center", marginTop: -6 }}>
          Mirzanagar, Ashulia, Savar, Dhaka-1344, Bangladesh
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <div>Serial No: <b>{rx.prescription_serial}</b></div>
          <div>Date: {new Date().toLocaleDateString()}</div>
        </div>

        <table className="info-table">
          <tbody>
            <tr>
              <td>Patient ID: {p.patient_id}</td>
              <td>Phone: {p.phone}</td>
              <td>Name: {p.name}</td>
            </tr>
            <tr>
              <td>Gender: {p.gender}</td>
              <td>Age: {p.age ?? "____"}</td>
              <td>Height: ____ cm</td>
            </tr>
            <tr>
              <td>Weight: ____ kg</td>
              <td>BP: ____ / ____</td>
              <td>Department: ________</td>
            </tr>
            <tr>
              <td>Doctor ID: ____</td>
              <td colSpan="2">Doctor Name: ________</td>
            </tr>
          </tbody>
        </table>

        {/* BLANK AREAS */}
        <div className="blank-block">
          <b>Symptoms:</b>
          <div className="blank-line"></div>
          <div className="blank-line"></div>
        </div>

        <div className="blank-block">
          <b>Diagnosis:</b>
          <div className="blank-line"></div>
          <div className="blank-line"></div>
        </div>

        <div className="blank-block">
          <b>Medicines:</b>
          <table className="medicine-table">
            <thead>
              <tr>
                <th>Medicine Names</th>
                <th>Dosage</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="blank-block">
          <b>Tests:</b>
          <div className="blank-line"></div>
        </div>

        <div className="flex justify-end mt-16">
          <div className="text-center">
            <div className="border-t w-40"></div>
            <p className="text-sm mt-1">Doctor Signature</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HandwrittenPrescriptionPrint;
