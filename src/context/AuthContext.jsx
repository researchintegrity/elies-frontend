// src/context/authcontext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

// our api url (from the readme, right?)
const API_BASE_URL = 'http://localhost:8000';

// 1. just creating the context here
const AuthContext = createContext();

// 2. this is the provider component that wraps everything
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null); // state for the token...
  const [user, setUser] = useState(null); // ...state for the user...
  const [loading, setLoading] = useState(true); // loading starts true 'cause we have to check localstorage first
  const [error, setError] = useState(null); // and one for errors, i guess

  // this runs once when the app starts
  useEffect(() => {
    try {
      // check localstorage to see if we're already logged in
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("failed to load auth data", err);
      // if localstorage is messed up, just log out
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false); // ok, we're done checking
    }
  }, []); // empty array means this only runs once

  // --- login function ---
  const login = async (usernameOrEmail, password) => {
    setLoading(true);
    setError(null);
    
    // client-side check. just to be safe.
    if (!usernameOrEmail || !password) {
      setError("username and password are required.");
      setLoading(false);
      return;
    }

    // ok this login is weird, api wants 'x-www-form-urlencoded' not json
    // so i gotta use this urlsearchparams thing...
    const body = new URLSearchParams();

    // ***** the real fix is here *****
    // the api needs grant_type to be the literal string 'password'
    // this should fix the 422 error.
    body.append('grant_type', 'password');
    // ********************************

    body.append('username', usernameOrEmail);
    body.append('password', password);

    try {
      // actually call the api now
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(), // gotta .tostring() the body, i guess
      });

      const data = await response.json();

      if (!response.ok) {
        // trying to get the specific error message from the api
        // this is better error handling, like you asked for
        let errorMsg = 'login failed. please try again.';
        if (data.detail && data.detail[0] && data.detail[0].msg) {
          // 422 validation error
          errorMsg = data.detail[0].msg;
        } else if (data.detail) {
          // 401 unauthorized error (probably)
          errorMsg = data.detail;
        }
        throw new Error(errorMsg);
      }

      // nice, it worked.
      setToken(data.access_token);
      setUser(data.user);
      
      // save token and user to localstorage so we stay logged in
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

    } catch (err) {
      // whoops, login failed. show the error
      setError(err.message);
    } finally {
      setLoading(false); // done loading either way
    }
  };

  // --- register function ---
  // this one takes all the new user info
  const register = async (username, name, email, password) => {
    setLoading(true);
    setError(null);

    // client-side check.
    if (!username || !name || !email || !password) {
      setError("all fields are required for registration.");
      setLoading(false);
      return;
    }

    try {
      // this api is normal, it wants json. cool.
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          full_name: name, // mapping our 'name' state to 'full_name' for the api
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // better error parsing here too
        let errorMsg = 'could not register. please try again.';
        if (data.detail && data.detail[0] && data.detail[0].msg) {
          errorMsg = data.detail[0].msg;
        } else if (data.detail) {
          errorMsg = data.detail;
        }
        throw new Error(errorMsg);
      }

      // sweet, register worked. api gave us the token and user
      setToken(data.access_token);
      setUser(data.user);
      
      // save to localstorage too
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

    } catch (err) {
      // ugh, register failed.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- logout function ---
  const logout = () => {
    // just clear everything
    setToken(null);
    setUser(null);
    // clear state and localstorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  // 3. this is all the stuff our context will give to the app
  const value = {
    isAuthenticated: !!token, // convert token string to boolean
    token,
    user, // components will need the user object
    loading, // so they know if we're logging in
    error,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* wait until we're done checking localstorage */}
      {/* this stops the login page from flashing for a sec if we're already logged in */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 4. just a shortcut so we don't have to import usecontext and authcontext everywhere
// just... useauth()
export const useAuth = () => {
  return useContext(AuthContext);
};