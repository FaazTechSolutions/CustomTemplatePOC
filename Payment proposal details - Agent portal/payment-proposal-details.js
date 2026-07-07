var _this = this;

(function ($) {

  /* TransactionNumber — from route params or ParentData */
  // var TRANSACTION_NUMBER = _this.globalService.route.queryParams._value.TransactionNumber;
  var TRANSACTION_NUMBER = "PP-000000028";

  /* User-Id header */
  var USER_ID = 'a.hyder';

  var API_URL = 'https://bcp.mawarid.com.sa/api/v1/dynamicrestapicallfrombody?user-id=' + encodeURIComponent(USER_ID);

  /* ──────────────────────────────────────────────────────────────
     2. DOM CACHE
     ────────────────────────────────────────────────────────────── */
  var $w = $('.ppd-widget');
  var $skeleton = $w.find('#ppd-skeleton');
  var $error = $w.find('#ppd-error');
  var $errMsg = $w.find('#ppd-error-msg');
  var $details = $w.find('#ppd-details-wrap');
  var $badge = $w.find('#ppd-status-badge');
  var $badgeLbl = $w.find('#ppd-badge-label');
  var $fieldsGrid = $w.find('#ppd-fields-grid');
  var $btnRetry = $w.find('#ppd-btn-retry');

  /* ──────────────────────────────────────────────────────────────
     3. HELPERS
     ────────────────────────────────────────────────────────────── */
  function setBadge(type, label) {
    $w.find('.ppd-toolbar-right').removeClass('d-none');
    $badge.removeClass('success error loading');
    if (type) $badge.addClass(type);
    $badgeLbl.text(label);
  }

  function prettyLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).trim();
  }

  function escHtml(str) {
    return $('<div/>').text(String(str)).html();
  }

  /* ──────────────────────────────────────────────────────────────
     4. BUILD REQUEST PAYLOAD
     ────────────────────────────────────────────────────────────── */
  function buildPayload() {
    return {
      Body: JSON.stringify({
        _request: {
          Company: "MWD",
          TransactionNumber: TRANSACTION_NUMBER || ""
        }
      }),
      Headers: [
        { Name: 'Authorization', Type: {}, Value: 'getToken' }
      ],
      Path: [],
      URL: 'https://almawarid.operations.dynamics.com/api/services/MWRecIntegration/MWRecPortalIntegrationService/GetPaymentProposalDetails',
      Method: 'POST',
      QueryStrings: [],
      ResponseView: 'Return',
      DeserializeResponse: true,
      RequestType: ''
    };
  }

  /* ──────────────────────────────────────────────────────────────
     5. LOAD DATA API CALL
     ────────────────────────────────────────────────────────────── */
  function loadData() {
    $skeleton.removeClass('hidden');
    $error.addClass('hidden');
    $details.addClass('hidden');
    setBadge('loading', 'Loading…');

    if (!TRANSACTION_NUMBER) {
      showError('No TransactionNumber provided in the URL or component context.');
      setBadge('error', 'Missing ID');
      return;
    }

    $.ajax({
      url: API_URL,
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://portal.mawarid.com.sa'
      },
      data: JSON.stringify(buildPayload()),
      timeout: 30000,
    })
      .done(function (resp) {
        $skeleton.addClass('hidden');
        var raw = resp;

        /* The proxy may return inner object as a string */
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch (e) { }
        }

        var data = raw.Return || raw.Data || raw.Result || raw;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { }
        }

        var list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && data.Return && Array.isArray(data.Return)) {
          list = data.Return;
        } else if (data && typeof data === 'object') {
          list = [data];
        }

        /* Filter response array by TransactionNumber */
        var matchedItem = null;
        for (var i = 0; i < list.length; i++) {
          if (String(list[i].TransactionNumber) === String(TRANSACTION_NUMBER)) {
            matchedItem = list[i];
            break;
          }
        }

        if (!matchedItem) {
          showError('No record found for Transaction Number: ' + TRANSACTION_NUMBER);
          setBadge('error', 'Not Found');
          return;
        }

        renderDetails(matchedItem);
        setBadge('success', 'Loaded');
      })
      .fail(function (xhr, status, err) {
        $skeleton.addClass('hidden');
        var msg = (xhr.responseJSON && xhr.responseJSON.Message)
          || (xhr.responseJSON && xhr.responseJSON.message)
          || err || status || 'Network error';
        showError(msg);
        setBadge('error', 'Error');
      });
  }

  /* ──────────────────────────────────────────────────────────────
     6. RENDER DATA TO DOM
     ────────────────────────────────────────────────────────────── */
  function showError(msg) {
    $error.removeClass('hidden');
    $errMsg.text(msg || 'An unexpected error occurred.');
    $details.addClass('hidden');
  }

  function renderDetails(data) {
    $details.removeClass('hidden');

    var dataFields = {};
    $.each(data, function (key, val) {
      if (typeof val === 'object' && val !== null) return;
      dataFields[key] = val !== null && val !== undefined && val !== '' ? String(val) : '—';
    });

    function popField(key) {
      var val = dataFields[key];
      delete dataFields[key];
      return val || '—';
    }

    var orderedFields = [];

    orderedFields.push({ label: 'Transaction No', value: TRANSACTION_NUMBER });
    orderedFields.push({ label: 'Transaction Number', value: popField('TransactionNumber') });

    var vendorVal = dataFields['VendorName'] || dataFields['VendorAccount'] || '—';
    delete dataFields['VendorName'];
    delete dataFields['VendorAccount'];
    orderedFields.push({ label: 'Vendor', value: vendorVal });
    
    orderedFields.push({ label: 'Description', value: popField('Description') });
    orderedFields.push({ label: 'Sid', value: popField('Sid') });
    orderedFields.push({ label: 'Name', value: popField('Name') });
    orderedFields.push({ label: 'Trans Date', value: popField('TransDate') });
    orderedFields.push({ label: 'Total Earning', value: popField('TotalEarning') });
    orderedFields.push({ label: 'Payment Type', value: popField('PaymentType') });
    orderedFields.push({ label: 'Net Amount', value: popField('NetAmount') });
    orderedFields.push({ label: 'Total Deduction', value: popField('TotalDeduction') });

    var extraFields = [];
    var totalAmountVal = dataFields['Amount'] || dataFields['TotalAmount'];
    if (totalAmountVal) {
      var curr = dataFields['Currency'] ? ' ' + dataFields['Currency'] : '';
      extraFields.push({ label: 'Total Amount', value: totalAmountVal + curr });
    }
    delete dataFields['Amount'];
    delete dataFields['TotalAmount'];
    delete dataFields['Currency'];
    delete dataFields['Company'];
    delete dataFields['CompanyId'];
    delete dataFields['Status'];

    $.each(dataFields, function(key, val) {
      extraFields.push({ label: prettyLabel(key), value: val });
    });

    var allFields = orderedFields.concat(extraFields);

    var html = '';
    for (var k = 0; k < allFields.length; k++) {
      var item = allFields[k];
      html += '<div class="ppd-field-item">'
        + '<p class="ppd-field-label">' + escHtml(item.label) + '</p>'
        + '<p class="ppd-field-value">' + escHtml(item.value) + '</p>'
        + '</div>';
    }

    $fieldsGrid.html(html || '<p style="padding:16px;color:var(--clr-text-3)">No additional fields provided.</p>');
  }

  /* ──────────────────────────────────────────────────────────────
     7. BINDINGS & INIT
     ────────────────────────────────────────────────────────────── */
  $btnRetry.on('click', loadData);

  /* Initialize immediately if DOM is ready */
  $(document).ready(function () {
    loadData();
  });

})(jQuery);
