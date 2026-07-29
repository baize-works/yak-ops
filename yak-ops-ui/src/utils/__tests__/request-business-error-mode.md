# Business error handling verification

This document records the expected behavior covered by the request wrapper implementation:

- Envelope APIs (`HttpUtils.get/post/put/delete`) resolve a non-success business response after the shared `notifyOnce` notification is displayed.
- Data APIs (`getData/postData/putData/deleteData`) keep rejecting non-success business responses so callers never unwrap failed payloads.
- Authentication failures always reject and continue through the shared session-expiry flow.
- Data source page actions do not display a second local error message after the shared request notification.
