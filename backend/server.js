const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in backend/.env");
  process.exit(1);
}

// ==================== DATABASE ====================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) =>
    console.error("MongoDB connection error:", error.message)
  );

// ==================== USER MODEL ====================

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ==================== FDR MODEL ====================

const fdrSchema = new mongoose.Schema(
  {
    fdrNumber: { type: String, required: true },
    bank: { type: String, required: true },
    branch: { type: String, default: "" },
    amount: { type: Number, required: true },
    issueDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    department: { type: String, default: "Administration" },
    purpose: { type: String, default: "Security Deposit" },
    status: {
      type: String,
      enum: ["Active", "Pending", "Renewed", "Matured"],
      default: "Active"
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Discrepancy"],
      default: "Pending"
    },
    notes: { type: String, default: "" },
    linkedFdrNumber: { type: String, default: "" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

fdrSchema.index({ userId: 1, fdrNumber: 1 }, { unique: true });

const FDR = mongoose.model("FDR", fdrSchema);

// ==================== AUTHENTICATION ====================

function createToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: "1d"
  });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please log in first" });
  }

  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Your session has expired. Please log in again."
    });
  }
}

// Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Please fill in all fields"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12)
    });

    res.status(201).json({
      message: "Account created successfully",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Could not create account" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Enter your email and password"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      message: "Login successful",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// Validate saved login
app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "_id name email"
    );

    if (!user) {
      return res.status(401).json({ message: "Account not found" });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch {
    res.status(500).json({ message: "Could not validate session" });
  }
});

// ==================== PRIORITY ENGINE ====================

function getPriority(fdr) {
  const daysLeft = Math.ceil(
    (new Date(fdr.maturityDate) - new Date()) / 86400000
  );

  if (fdr.verificationStatus === "Discrepancy" || daysLeft < 0) {
    return "Critical";
  }

  if (daysLeft <= 30 || fdr.verificationStatus === "Pending") {
    return "High";
  }

  if (daysLeft <= 90) {
    return "Medium";
  }

  return "Normal";
}

// ==================== HOME ====================

app.get("/", (req, res) => {
  res.json({
    message: "FDR Guardian API is running",
    version: "1.0.0"
  });
});

// ==================== DASHBOARD ====================

app.get("/api/dashboard", authenticate, async (req, res) => {
  try {
    const fdrs = await FDR.find({ userId: req.user.id });

    const priorityCounts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Normal: 0
    };

    fdrs.forEach((fdr) => {
      priorityCounts[getPriority(fdr)]++;
    });

    res.json({
      totalFDRs: fdrs.length,
      totalAmount: fdrs.reduce((sum, fdr) => sum + fdr.amount, 0),
      pendingVerification: fdrs.filter(
        (fdr) => fdr.verificationStatus === "Pending"
      ).length,
      upcomingMaturities: fdrs.filter((fdr) => {
        const days = Math.ceil(
          (new Date(fdr.maturityDate) - new Date()) / 86400000
        );
        return days >= 0 && days <= 90;
      }).length,
      priorityCounts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== GET FDRS ====================

app.get("/api/fdrs", authenticate, async (req, res) => {
  try {
    const fdrs = await FDR.find({ userId: req.user.id }).sort({
      createdAt: -1
    });

    res.json(
      fdrs.map((fdr) => ({
        ...fdr.toObject(),
        priority: getPriority(fdr)
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== GET ONE FDR ====================

app.get("/api/fdrs/:id", authenticate, async (req, res) => {
  try {
    const fdr = await FDR.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!fdr) {
      return res.status(404).json({ message: "FDR not found" });
    }

    res.json({
      ...fdr.toObject(),
      priority: getPriority(fdr)
    });
  } catch {
    res.status(400).json({ message: "Invalid FDR ID" });
  }
});

// ==================== CREATE FDR ====================

app.post("/api/fdrs", authenticate, async (req, res) => {
  try {
    const {
      fdrNumber,
      bank,
      branch,
      amount,
      issueDate,
      maturityDate,
      department,
      purpose,
      notes,
      linkedFdrNumber
    } = req.body;

    if (
      !fdrNumber?.trim() ||
      !bank?.trim() ||
      amount === undefined ||
      !issueDate ||
      !maturityDate
    ) {
      return res.status(400).json({
        message: "Fill in all required FDR fields"
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    if (
      !Number.isFinite(new Date(issueDate).getTime()) ||
      !Number.isFinite(new Date(maturityDate).getTime()) ||
      new Date(maturityDate) <= new Date(issueDate)
    ) {
      return res.status(400).json({
        message: "Enter valid issue and maturity dates"
      });
    }

    const fdr = await FDR.create({
      fdrNumber: fdrNumber.trim(),
      bank: bank.trim(),
      branch,
      amount: Number(amount),
      issueDate,
      maturityDate,
      department,
      purpose,
      notes,
      linkedFdrNumber,
      userId: req.user.id
    });

    res.status(201).json({
      message: "FDR registered successfully",
      fdr: {
        ...fdr.toObject(),
        priority: getPriority(fdr)
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This FDR number already exists in your account"
      });
    }

    res.status(400).json({ message: error.message });
  }
});

// ==================== UPDATE FDR ====================

app.put("/api/fdrs/:id", authenticate, async (req, res) => {
  try {
    const allowedFields = [
      "fdrNumber",
      "bank",
      "branch",
      "amount",
      "issueDate",
      "maturityDate",
      "department",
      "purpose",
      "status",
      "verificationStatus",
      "notes",
      "linkedFdrNumber"
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const fdr = await FDR.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!fdr) {
      return res.status(404).json({ message: "FDR not found" });
    }

    res.json({
      message: "FDR updated successfully",
      fdr
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== DELETE FDR ====================

app.delete("/api/fdrs/:id", authenticate, async (req, res) => {
  try {
    const fdr = await FDR.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!fdr) {
      return res.status(404).json({ message: "FDR not found" });
    }

    res.json({ message: "FDR deleted successfully" });
  } catch {
    res.status(400).json({ message: "Invalid FDR ID" });
  }
});

// ==================== BASIC CONSISTENCY CHECK ====================

app.post("/api/fdrs/:id/verify", authenticate, async (req, res) => {
  try {
    const fdr = await FDR.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!fdr) {
      return res.status(404).json({ message: "FDR not found" });
    }

    const issues = [];

    if (!fdr.fdrNumber) issues.push("FDR number is missing");
    if (!fdr.bank) issues.push("Bank name is missing");
    if (fdr.amount <= 0) issues.push("Invalid amount");

    if (new Date(fdr.maturityDate) <= new Date(fdr.issueDate)) {
      issues.push("Maturity date must be after issue date");
    }

    fdr.verificationStatus = issues.length
      ? "Discrepancy"
      : "Pending";

    await fdr.save();

    res.json({
      message: issues.length
        ? "Discrepancies found"
        : "Basic checks passed. Official bank verification is still required.",
      verificationStatus: fdr.verificationStatus,
      issues,
      officialBankVerificationRequired: true
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`FDR Guardian API running on port ${PORT}`);
});