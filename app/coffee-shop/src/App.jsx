import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

// ----- Components -----

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const navigate = useNavigate();

  useEffect(() => {
    // Update login status if token changes
    const checkLoginStatus = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    window.addEventListener("storage", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    await fetch("http://localhost/api/logout", {
      method: "POST",
      credentials: "include",
    });
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <nav className="bg-gray-900 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">Coffee Shop</Link>
        <div className="flex gap-4">
          <Link to="/" className="hover:text-brown-300">Home</Link>
          <Link to="/shop?msg=✅ Free Delivery" className="hover:text-brown-300">Shop</Link>
          {isLoggedIn
            ? (
              <>
                <Link to="/dashboard" className="hover:text-brown-300">
                  Dashboard
                </Link>
                <Link to="/profile" className="hover:text-brown-300">
                  Profile
                </Link>
                <Link to="/transfer" className="hover:text-brown-300">
                  Transfer
                </Link>
                <button onClick={handleLogout} className="text-red-600 cursor-pointer">
                  Logout
                </button>
              </>
            )
            : (
              <>
                <Link to="/login" className="hover:text-brown-300">Login</Link>
                <Link to="/register" className="hover:text-brown-300">
                  Register
                </Link>
              </>
            )}
        </div>
      </div>
    </nav>
  );
};

// Protected route HOC
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = !!localStorage.getItem("token");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const ProfilePage = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const updates = {};
    if (name) updates.name = name;
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      setError("No changes to save");
      return;
    }

    const token = localStorage.getItem("token");
    fetch("http://localhost/api/profile/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setMessage("Profile updated successfully");
          setPassword("");
          setConfirmPassword("");
        }
      })
      .catch((err) => {
        console.error("Error updating profile:", err);
        setError("An error occurred while updating your profile");
      });
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Edit Profile</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Leave blank to keep current name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Leave blank to keep current password"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

const TransferPage = () => {
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost/api/users", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!receiverId) {
      setError("Please select a recipient");
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const token = localStorage.getItem("token");
    fetch("http://localhost/api/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiver_id: parseInt(receiverId),
        amount: parseFloat(amount),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setMessage("Transfer successful");
          setAmount("");
          setReceiverId("");
        }
      })
      .catch((err) => {
        console.error("Error making transfer:", err);
        setError("An error occurred during the transfer");
      });
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Transfer Credit</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Recipient</label>
          <select
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select a recipient</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.username})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded"
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800"
        >
          Transfer
        </button>
      </form>
    </div>
  );
};

const Dashboard = () => {
  const [purchases, setPurchases] = useState([]);
  const [balance, setBalance] = useState(null);
  const [name, setName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Fetch purchases
    fetch("http://localhost/api/user/purchases", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPurchases(data.purchases || []);
        }
      })
      .catch((err) => {
        console.error("Error fetching purchases:", err);
        setError("An error occurred while fetching your purchases");
      })
      .finally(() => {
        if (!balance) {
          setLoading(false);
        }
      });

    // Fetch balance
    fetch("http://localhost/api/stats", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError((prev) => prev ? `${prev}. ${data.error}` : data.error);
        } else {
          setBalance(data.amount);
          setName(data.name);
        }
      })
      .catch((err) => {
        console.error("Error fetching balance:", err);
        setError((prev) =>
          prev ? `${prev}. Error fetching balance` : "Error fetching balance"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Welcome, {name}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h2 className="text-2xl font-bold mb-2">Current Balance</h2>
        {balance !== null
          ? (
            <div className="text-3xl font-semibold text-green-600">
              ${parseFloat(balance).toFixed(2)}
            </div>
          )
          : <div className="text-gray-600">Unable to retrieve balance</div>}
      </div>

      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4">Purchase History</h2>

        {purchases.length > 0
          ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2">Coffee</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t">
                    <td className="p-2">{purchase.name}</td>
                    <td className="text-right p-2">
                      ${purchase.price.toFixed(2)}
                    </td>
                    <td className="text-right p-2">{purchase.amount}</td>
                    <td className="text-right p-2">
                      ${(purchase.price * purchase.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          : <p className="text-gray-600">You haven't made any purchases yet.
          </p>}

        <div className="mt-6">
          <Link
            to="/shop"
            className="inline-block bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  );
};

// ----- Pages -----
const HomePage = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Our Coffee Shop</h1>
        <p className="text-xl mb-8">
          Enjoy the finest selection of coffees from around the world
        </p>
        <Link
          to="/shop"
          className="bg-gray-700 text-white px-6 py-3 rounded hover:bg-gray-800"
        >
          Browse Our Coffee
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <div className="bg-gray-100 p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">Premium Beans</h2>
          <p>
            We source only the highest quality beans from sustainable farms
            across the globe.
          </p>
        </div>
        <div className="bg-gray-100 p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">Expert Roasting</h2>
          <p>
            Our master roasters bring out the unique flavors in each batch of
            coffee.
          </p>
        </div>
        <div className="bg-gray-100 p-6 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">Fresh Delivery</h2>
          <p>
            Enjoy your coffee at its peak freshness with our quick delivery
            service.
          </p>
        </div>
      </div>
    </div>
  );
};

const ShopPage = () => {
  const [coffees, setCoffees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location);
    const message = url.searchParams.get("msg")
    if(message) setMessage(message);
    fetch("http://localhost/api/coffees")
      .then((res) => res.json())
      .then((data) => {
        setCoffees(data.coffees);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching coffees:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Our Coffee Selection
      </h1>
      <h2 className="text-2xl font-bold mb-8 text-center" dangerouslySetInnerHTML={{ __html: message }}></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coffees.map((coffee) => (
          <div
            key={coffee.id}
            className="bg-white rounded shadow-md overflow-hidden"
          >
            <img
              src={coffee.image || "/api/placeholder/300/200"}
              alt={coffee.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{coffee.name}</h2>
              <p className="text-green-600 font-bold">
                ${coffee.price.toFixed(2)}
              </p>
              <Link
                to={`/coffee/${coffee.id}`}
                className="mt-4 inline-block bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CoffeeDetailPage = () => {
  const [coffee, setCoffee] = useState({
    name: "",
    price: 0,
    image: "",
  });
  const [comments, setComments] = useState([]);
  const [purchaseAmount, setPurchaseAmount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const navigate = useNavigate();
  const coffeeId = window.location.pathname.split("/")[2];
  async function init() {
    const r = await fetch(`http://localhost/api/coffee/${coffeeId}`);
    const R = await fetch(`http://localhost/api/coffee/${coffeeId}/comments`);
    const j = await r.json();
    const J = await R.json();
    setCoffee(j["coffee"]);
    setComments(J["comments"]);
    console.log(J["comments"]);
    setLoading(false);
  }
  useEffect(() => {
    init();
    // Fetch comments - this endpoint is not in the provided API but would be needed
    // In a real app, you'd implement this endpoint
  }, [coffeeId]);

  const handlePurchase = () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const token = localStorage.getItem("token");
    fetch("http://localhost/api/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: localStorage.getItem("user_id"),
        coffee_id: coffeeId,
        amount: purchaseAmount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          alert("Purchase successful!");
          navigate("/dashboard");
        }
      })
      .catch((err) => {
        console.error("Error making purchase:", err);
        alert("There was an error processing your purchase");
      });
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const token = localStorage.getItem("token");
    fetch(`http://localhost/api/coffee/${coffeeId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ content: comment }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          setComment("");
          // Ideally, you'd refresh comments here
          alert("Comment added successfully!");
        }
      })
      .catch((err) => {
        console.error("Error adding comment:", err);
      });
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!coffee) {
    return <div className="text-center py-12">Coffee not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
            <img
              src={coffee.image || "/api/placeholder/500/500"}
              alt={coffee.name}
              className="w-full h-64 md:h-full object-cover"
            />
          </div>
          <div className="md:w-1/2 p-6">
            <h1 className="text-3xl font-bold mb-4">{coffee.name}</h1>
            <p className="text-green-600 text-xl font-bold mb-4">
              ${coffee.price.toFixed(2)}
            </p>
            <p className="mb-6">
              A delicious blend of premium coffee beans, roasted to perfection
              to bring out rich flavors.
            </p>

            {isLoggedIn && (
              <div className="mb-6">
                <label className="block mb-2">Quantity:</label>
                <div className="flex items-center">
                  <button
                    onClick={() =>
                      setPurchaseAmount(Math.max(1, purchaseAmount - 1))}
                    className="bg-gray-200 px-3 py-1 rounded-l"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) =>
                      setPurchaseAmount(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )}
                    className="w-16 text-center border-t border-b py-1"
                    min="1"
                  />
                  <button
                    onClick={() => setPurchaseAmount(purchaseAmount + 1)}
                    className="bg-gray-200 px-3 py-1 rounded-r"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {isLoggedIn
              ? (
                <button
                  onClick={handlePurchase}
                  className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-800"
                >
                  Purchase Now
                </button>
              )
              : (
                <Link
                  to={"/login?redirect=" + window.location.href}
                  className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-800 inline-block"
                >
                  Login to Purchase
                </Link>
              )}
          </div>
        </div>

        <div className="p-6 border-t">
          <h2 className="text-2xl font-bold mb-4">Customer Comments</h2>

          {isLoggedIn && (
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                rows="3"
                placeholder="Share your thoughts about this coffee..."
                required
              >
              </textarea>
              <button
                type="submit"
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                Add Comment
              </button>
            </form>
          )}

          {comments.length > 0
            ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded">
                    <p
                      className="mb-2"
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    >
                    </p>
                    <p className="text-gray-600 text-sm">
                      By {comment.name}
                    </p>
                  </div>
                ))}
              </div>
            )
            : (
              <p className="text-gray-600">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    fetch("http://localhost/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          localStorage.setItem("user_id", data.userId);
          localStorage.setItem("token", data.token);
          const url = new URL(window.location);
          const redirectUrl = url.searchParams.get("redirect");
          if (redirectUrl) {
            window.location.href = redirectUrl; // Redirecting the user
          } else window.location.href = "/dashboard";
        }
      })
      .catch(() => setError("An error occurred during login"));
  };

  const handleGenerateOtp = () => {
    if (!userId) {
      setError("Please enter your username");
      return;
    }

    fetch(`http://localhost/api/generate-otp/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOtpSent(true);
        }
      })
      .catch(() => setError("Failed to generate OTP"));
  };

  const handleResetPin = () => {
    fetch(`http://localhost/api/reset-pin/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp, password: newPassword }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setResetMode(false);
          setError("");
        }
      })
      .catch(() => setError("Failed to reset PIN"));
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {resetMode ? "Reset PIN" : "Login"}
      </h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {!resetMode
        ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded shadow-md"
          >
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800"
            >
              Login
            </button>
            <p className="mt-4 text-center">
              Don't have an account?{" "}
              <Link to="/register" className="text-brown-700">Register</Link>
            </p>
            <p className="mt-2 text-center">
              <button
                onClick={() => setResetMode(true)}
                className="text-blue-600 underline"
              >
                Forgot Password?
              </button>
            </p>
          </form>
        )
        : (
          <div className="bg-white p-6 rounded shadow-md">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            {otpSent
              ? (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    onClick={handleResetPin}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                  >
                    Reset PIN
                  </button>
                </>
              )
              : (
                <button
                  onClick={handleGenerateOtp}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Generate OTP
                </button>
              )}
            <p className="mt-4 text-center">
              <button
                onClick={() => setResetMode(false)}
                className="text-blue-600 underline"
              >
                Back to Login
              </button>
            </p>
          </div>
        )}
    </div>
  );
};

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    fetch("http://localhost/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, username, password, role }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          alert("Registration successful! Please login.");
          navigate("/login");
        }
      })
      .catch((err) => {
        console.error("Registration error:", err);
        setError("An error occurred during registration");
      });
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Register</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800"
        >
          Register
        </button>

        <p className="mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-brown-700">Login</Link>
        </p>
      </form>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/coffee/:id" element={<CoffeeDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<CreateCoffee />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfer"
              element={
                <ProtectedRoute>
                  <TransferPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}


const CreateCoffee = () => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

  useEffect(() => {
    const d = parseJwt(localStorage.getItem('token'));
    if(d.role !== 'admin') window.location.href = '/';
  },[]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost/api/coffee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          image: formData.image || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create coffee");
      }

      setMessage(
        `Coffee "${formData.name}" created successfully with ID: ${data.id}`,
      );
      // Reset form after successful submission
      setFormData({
        name: "",
        price: "",
        image: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Add New Coffee</h2>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-200 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="name"
          >
            Coffee Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brown-500"
            required
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="price"
          >
            Price ($) *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brown-500"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="mb-6">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="image"
          >
            Image URL (optional)
          </label>
          <input
            type="text"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brown-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded font-bold text-white ${
            loading ? "bg-gray-400" : "bg-brown-600 hover:bg-brown-700"
          }`}
        >
          {loading ? "Creating..." : "Add Coffee"}
        </button>
      </form>
    </div>
  );
};

export default App;
