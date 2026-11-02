exports.up = (pgm) => {
  pgm.addColumn("phone_otp", {
    type: {
      type: "varchar(50)",
      notNull: true,
      default: "phone_verification",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("phone_otp", "type");
};
