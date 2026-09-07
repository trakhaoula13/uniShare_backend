const User = require("../models/User");
const Course = require("../models/Course");
const Assignment = require("../models/Assignment");
const Todo = require("../models/Todo");

// @route GET /api/stats/me
exports.getMyStats = async (req, res) => {
  const owner = req.user._id;
  const [coursesCount, pendingAssignments, doneAssignments, todosCount, todosDone] = await Promise.all([
    Course.countDocuments({ owner }),
    Assignment.countDocuments({ owner, status: { $ne: "done" } }),
    Assignment.countDocuments({ owner, status: "done" }),
    Todo.countDocuments({ owner }),
    Todo.countDocuments({ owner, done: true }),
  ]);

  res.json({ coursesCount, pendingAssignments, doneAssignments, todosCount, todosDone });
};

// @route GET /api/stats/admin
exports.getAdminStats = async (req, res) => {
  const [usersCount, adminsCount, coursesCount, assignmentsCount] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    Course.countDocuments(),
    Assignment.countDocuments(),
  ]);

  res.json({ usersCount, adminsCount, coursesCount, assignmentsCount });
};
