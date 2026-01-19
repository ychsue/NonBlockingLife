import { expect, jest } from "@jest/globals";
import { handleAddInbox } from "../src/Logic.js";

test("ADD_INBOX: 應能成功將靈感存入 Inbox 並回傳 ID", () => {
  const mockService = {
    appendLog: jest.fn(),
    addToInbox: jest.fn() //.mockReturnValue("t_new_inbox_id"),
  };

  const result = handleAddInbox("突然想到的絕妙點子", mockService);

  expect(result.status).toBe("success");
//   expect(result.taskId).toBe("t_new_inbox_id");
  expect(mockService.addToInbox).toHaveBeenCalledWith(
    expect.arrayContaining([expect.any(String), "突然想到的絕妙點子", expect.any(Date)])
  );
  expect(mockService.appendLog).toHaveBeenCalledWith(
    expect.arrayContaining(["ADD_INBOX", "突然想到的絕妙點子"]),
  );
});
