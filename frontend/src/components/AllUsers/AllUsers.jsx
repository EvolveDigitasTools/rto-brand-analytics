import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { RTOContext } from "../../Context/RTOContext";
import './AllUsers.css';
import { FaUsers } from "react-icons/fa";

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
  integrity="sha512-Kf1pU2x3Jr4hHhjwP+Z5DeuPvV3vJqUuF4J8O7t6hH3TZQ4vR7XvvzBfZzV5zK2qW7r4mPbiRZrx2pHIMm1sRw=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
/>


const AllUsers = () => {
    const API_URL = process.env.REACT_APP_API_URL;
    const { user } = useContext(RTOContext);
    const [users, setUsers] = useState([]);
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [loadingPassword, setLoadingPassword] = useState({});
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "user"
    });
    const [editingUserId, setEditingUserId] = useState(null);

    // Fetch All Users
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_URL}/auth/users`, {
                headers: { Authorization: `Bearer ${token}`},
            });            
            
            if (res.data.success) {
                setUsers(res.data.users || []);
                 console.log("Fetched Users:", res.data);
            } else {
                console.error("Failed to fetch users:", res.data.message);
            }

        } catch (err) {
            console.error("Error Fetching users", err);
        }
    }

    useEffect(() => {
        if (user?.role === "superadmin") fetchUsers();
    }, [user]);

    const togglePassword = async (userId) => {
    if (visiblePasswords[userId]) {
      setVisiblePasswords(prev => ({ ...prev, [userId]: null }));
      return;
    }

    try {
      setLoadingPassword(prev => ({ ...prev, [userId]: true }));
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/users/${userId}/password`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && res.data.password) {
        // set the password for that user id
        setVisiblePasswords(prev => ({ ...prev, [userId]: res.data.password }));
      } else {
        console.error("Failed to fetch password:", res.data?.message || "No password returned");
        setVisiblePasswords(prev => ({ ...prev, [userId]: "[not available]" }));
      }
    } catch (err) {
      console.error("Error fetching password:", err.response?.data || err.message);
      setVisiblePasswords(prev => ({ ...prev, [userId]: "[error]" }));
    } finally {
      setLoadingPassword(prev => ({ ...prev, [userId]: false }));
    }
  };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Add New User
    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_URL}/auth/register`, formData, {
                headers: { Authorization: `Bearer ${token}`},
            });
            setFormData({ 
                name: "",
                email: "",
                password: "",
                role: "user"
            });
            fetchUsers();
        } catch (err) {
            console.error("Error Adding Users", err);
        }
    };

    // Edit Users
    const handleEditUsers = (user) => {
        setEditingUserId(user.id);
        setFormData({
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role
        });
    };

    // Update Users
    const handleUpdateUsers = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const res = await axios.put(
                `${API_URL}/auth/users/${editingUserId}/role`, 
                { role: formData.role }, 
                {
                  headers: { Authorization: `Bearer ${token}`},
                }
            );
            
            setEditingUserId(null);
            setFormData({ 
                name: "", 
                email: "", 
                password: "",
                role: "user"
            });
            fetchUsers();
        } catch (err) {
            console.error("Error Updating Users", err);
        }
    };

    // Delete Users
    const handleDeleteUsers = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?"))
            return;
        
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${API_URL}/auth/users/${id}`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            fetchUsers();
        } catch (err) {
            console.error("Error Deleting Users", err);
        }
    };

    return (
        <div className="Rto_all_users_page">

        <div className="all-users-container">
            
            <h2>
                <span className="userr_icon">
                    <FaUsers />
                </span>
                All Users
            </h2>

            <form 
                onSubmit={editingUserId ? handleUpdateUsers : handleAddUser}
                className="user-form"
            >
                <input 
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name} 
                    onChange={handleChange}
                    required
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input 
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email} 
                    onChange={handleChange}
                    required
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input 
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password} 
                    onChange={handleChange}
                    required
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select 
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">SuperAdmin</option>
                </select>
                <button
                    type="submit"
                    className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition duration-200"
                >
                    {editingUserId ? "Updated User" : "Add User"}
                </button>
            </form>

            <div className="table-wrapper">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th style={{ width: "200px" }}>Password</th>
                            <th>Role</th>
                            <th>Created At</th>
                            <th className="center" style={{ width: "200px" }}>Actions</th>                            
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, index) => (
                            <tr key={u.id}>
                                <td>{index + 1}</td>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>{u.password}</td>
                                <td className="capitalize">{u.role}</td>
                                <td>
                                    {new Date(u.created_at).toLocaleString()}
                                </td>
                                <td className="center">
                                    <button
                                        onClick={() => handleEditUsers(u)}
                                        className="edit-btn"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUsers(u.id)}
                                        className="delete-btn"
                                    >
                                        🗑️ Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="no-users">
                                        No users found
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>

        </div>
    )
}

export default AllUsers;