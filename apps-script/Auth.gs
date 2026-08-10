/**
 * Username + PIN auth for both staff and admins. PINs are never stored or
 * returned in plaintext — only a salted SHA-256 hash. There is no "forgot
 * PIN" lookup by design; admins reset a PIN by setting a new one.
 */

function makeSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPin_(pin, salt) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin) + String(salt));
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Returns the staff record (without PINSalt/PINHash) on success, or null. */
function authenticateStaff(username, pin) {
  var row = findRow('Staff', 'Username', username);
  if (!row) return null;
  if (row.Active !== true && row.Active !== 'Y' && row.Active !== 'TRUE') return null;
  if (hashPin_(pin, row.PINSalt) !== row.PINHash) return null;
  return stripAuthFields_(row);
}

/** Returns the admin record (without PINSalt/PINHash) on success, or null. */
function authenticateAdmin(username, pin) {
  var row = findRow('Admins', 'Username', username);
  if (!row) return null;
  if (hashPin_(pin, row.PINSalt) !== row.PINHash) return null;
  return stripAuthFields_(row);
}

function stripAuthFields_(row) {
  var copy = {};
  Object.keys(row).forEach(function (k) {
    if (k === 'PINSalt' || k === 'PINHash' || k === '_row') return;
    copy[k] = row[k];
  });
  return copy;
}

/** Admin action: set/reset a staff member's PIN. */
function setStaffPin(staffId, newPin) {
  var row = findRow('Staff', 'StaffID', staffId);
  if (!row) throw new Error('Staff not found: ' + staffId);
  var salt = makeSalt_();
  updateRowByIndex('Staff', row._row, { PINSalt: salt, PINHash: hashPin_(newPin, salt) });
}

/** Admin action: set/reset an admin's own or another admin's PIN. */
function setAdminPin(adminId, newPin) {
  var row = findRow('Admins', 'AdminID', adminId);
  if (!row) throw new Error('Admin not found: ' + adminId);
  var salt = makeSalt_();
  updateRowByIndex('Admins', row._row, { PINSalt: salt, PINHash: hashPin_(newPin, salt) });
}
