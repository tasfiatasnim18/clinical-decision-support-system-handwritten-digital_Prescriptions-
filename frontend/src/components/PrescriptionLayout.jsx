const PrescriptionLayout = ({ rx, mode = "view" }) => {
  if (!rx) return null;

  const p = rx.patient || {};

  const isPrint = mode === "print";
  const isDigital = mode === "digital";
  const isHandwritten = mode === "handwritten";

  return (
    <div className={isPrint ? "print-root" : ""}>
      <div className="print-page bg-white p-10 rounded-xl shadow">

        {/* ---------- HEADER ---------- */}
        <h3 className="text-center font-bold">
          Gonoshasthaya Samaj Vittik Medical College
        </h3>
        <p className="text-center text-sm -mt-1">
          Mirzanagar, Ashulia, Savar, Dhaka-1344, Bangladesh
        </p>

        <div className="flex justify-between mt-6 text-sm">
          <div>
            Serial No: <b>{rx.prescription_serial || "—"}</b>
          </div>
          <div>Date: {new Date().toLocaleDateString()}</div>
        </div>

        {/* ---------- PATIENT INFO ---------- */}
        <table className="info-table mt-4">
          <tbody>
            <tr>
              <td>Patient ID: {p.patient_id || "—"}</td>
              <td>Phone: {p.phone || "—"}</td>
              <td>Name: {p.name || "—"}</td>
            </tr>
            <tr>
              <td>Gender: {p.gender || "—"}</td>
              <td>Age: {p.age ?? "____"}</td>
              <td>Height: {isDigital ? p.height_cm : "____"} cm</td>
            </tr>
            <tr>
              <td>Weight: {isDigital ? p.weight_kg : "____"} kg</td>
              <td>BP: {isDigital ? `${p.bp_systolic}/${p.bp_diastolic}` : "____ / ____"}</td>
              <td>Department: {p.department || "________"}</td>
            </tr>
            <tr>
              <td>Doctor ID: {p.doctor_id || "____"}</td>
              <td colSpan="2">
                Doctor Name: {p.doctor_name || "________"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ---------- CLINICAL ---------- */}
        <Section title="Symptoms" blank />
        <Section title="Diagnosis" blank />

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

        <Section title="Tests" blank />

        {/* ---------- SIGNATURE ---------- */}
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

const Section = ({ title, blank }) => (
  <div className="blank-block">
    <b>{title}:</b>
    {blank && (
      <>
        <div className="blank-line"></div>
        <div className="blank-line"></div>
      </>
    )}
  </div>
);

export default PrescriptionLayout;
