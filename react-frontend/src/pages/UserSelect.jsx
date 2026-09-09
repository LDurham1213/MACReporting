import { useEffect, useState } from "react";

function UserSelect({ onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5001/users")
      .then(response => response.json())
      .then(data => setUsers(data))
      .catch(error => console.error("Error loading users:", error));
  }, []);

  function continueToApp() {
    if (!selectedUserId) return;
    onSelectUser(selectedUserId);
  }

  return (
    <div className="user-select-page">
      <div className="user-select-card">
        <h1>MACReporting</h1>
        <h2>Select User</h2>
        <p>Select a user to continue.</p>
        <select value={selectedUserId} onChange={event => setSelectedUserId(event.target.value)}>
          <option value="">Select demo user</option>
          {users.map(user => (
            <option key={user.user_id} value={user.user_id}>{`${user.first_name || ""} ${user.last_name || ""}`.trim()}</option>
          ))}
        </select>
        <button type="button" onClick={continueToApp} disabled={!selectedUserId}>Continue</button>
      </div>
    </div>
  );
}

export default UserSelect;