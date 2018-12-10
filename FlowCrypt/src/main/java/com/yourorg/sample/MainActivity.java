package com.yourorg.sample;

import android.content.Context;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.TextView;

import com.yourorg.sample.node.Node;
import com.yourorg.sample.node.NodeSecret;
import com.yourorg.sample.node.NodeSecretCerts;
import com.yourorg.sample.node.results.DecryptFileResult;
import com.yourorg.sample.node.results.DecryptMsgResult;
import com.yourorg.sample.node.results.EncryptFileResult;
import com.yourorg.sample.node.results.EncryptMsgResult;
import com.yourorg.sample.node.results.MsgBlock;
import com.yourorg.sample.node.results.PgpKeyInfo;
import com.yourorg.sample.node.results.RawNodeResult;
import com.yourorg.sample.node.results.TestNodeResult;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.Arrays;

public class MainActivity extends AppCompatActivity {

  final private String nodeSecretsCacheFilename = "flowcrypt-node-secrets-cache";
  final private static TestData testData = new TestData();
  final private String testMsg = Arrays.toString(testData.payload(0));

  private String newTitle = "Node";
  private String resultText = "";
  private TextView tvResult;
  private boolean hasTestFailure;


  Handler newTitleHandler = new Handler(new Handler.Callback() {
    @Override
    public boolean handleMessage(Message msg) {
      setTitle(newTitle);
      return true;
    }
  });

  Handler newResultTextHandler = new Handler(new Handler.Callback() {
    @Override
    public boolean handleMessage(Message msg) {
      tvResult.setText(resultText);
      return true;
    }
  });

  @Override
  protected void onCreate(Bundle savedInstanceState) {

    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    asyncGenSecretsAndStartNode();

    tvResult = findViewById(R.id.tvResult);

    findViewById(R.id.btnVersion).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        getVersionsAndRender(tvResult);
      }
    });
    findViewById(R.id.btnAllTests).setOnClickListener(new View.OnClickListener() {
      public void onClick(View v) {
        runAllTestsAndRender();
      }
    });
  }

  public void asyncGenSecretsAndStartNode() {
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          long start = System.currentTimeMillis();
          newTitleEvent("Loading cache..");
          NodeSecretCerts certsCache = nodeSecretCertsCacheLoad();
          NodeSecret nodeSecret;
          long secretsStart = System.currentTimeMillis();
          if(certsCache == null) {
            newTitleEvent("Generating node secrets..");
            nodeSecret = new NodeSecret(getFilesDir().getAbsolutePath());
            System.out.println("Generating secrets took " + (System.currentTimeMillis() - secretsStart) + "ms");
            // remember to cache node secrets for faster startup time
            nodeSecretCertsCacheSave(nodeSecret.getCache());
          } else {
            newTitleEvent("Loading node secrets..");
            nodeSecret = new NodeSecret(getFilesDir().getAbsolutePath(), certsCache);
            System.out.println("Loading secrets took " + (System.currentTimeMillis() - secretsStart) + "ms");
          }
          newTitleEvent("Starting Node..");
          long nodeStart = System.currentTimeMillis();
          Node.start(getAssets(), nodeSecret);
          System.out.println("Starting node took additional " + (System.currentTimeMillis() - nodeStart) + "ms");
          newTitleEvent("Waiting for Node to become ready..");
          long readyStart = System.currentTimeMillis();
          Node.waitUntilReady();
          System.out.println("Waiting for node to be ready took took additional " + (System.currentTimeMillis() - readyStart) + "ms");
          newTitleEvent("Node ready from " + (certsCache == null ? "scratch" : "cache") + " (" + (System.currentTimeMillis() - start) + "ms)");
        } catch(Exception e) {
          throw new RuntimeException("Could not initialize Node", e);
        }
      }
    }).start();
  }

  public void newTitleEvent(String title) {
    System.out.println("newTitleEvent: " + title);
    newTitle = title;
    newTitleHandler.sendEmptyMessage(0);
  }

  private void addResultLine(String actionName, long ms, String result, boolean isFinal) {
    result = ("ok".equals(result)) ? result : "***FAIL*** " + result;
    String line = (isFinal ? "-----------------\n" : "") + actionName + " [" + ms + "ms] " + result + "\n";
    System.out.print(line);
    resultText += line;
    newResultTextHandler.sendEmptyMessage(0);
  }

  private void addResultLine(String actionName, RawNodeResult result) {
    if(result.getErr() != null) {
      hasTestFailure = true;
      addResultLine(actionName, result.ms, result.getErr().getMessage(), false);
      result.getErr().printStackTrace(); // todo - acra
    } else {
      addResultLine(actionName, result.ms, "ok", false);
    }
  }

  private String encryptMsgAndRender(String actionName, byte[] data) {
    EncryptMsgResult r = Node.encryptMsg(data, testData.getMixedPubKeys());
    addResultLine(actionName, r);
    return r.getEncryptedString();
  }

  private byte[] encryptFileAndRender(String actionName, byte[] data) {
    EncryptFileResult r = Node.encryptFile(data, testData.getMixedPubKeys(), "file.txt");
    addResultLine(actionName, r);
    return r.getEncryptedDataBytes();
  }

  private void decryptFileAndRender(String actionName, byte[] data, PgpKeyInfo[] prvKeys) {
    DecryptFileResult r = Node.decryptFile(data, prvKeys, testData.passphrases(), null);
    if(r.getErr() != null) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, r.getErr().getMessage(), false);
      r.getErr().printStackTrace();
      // todo - acra
    } else if (r.getDecryptErr() != null) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, r.getDecryptErr().type + ":" + r.getDecryptErr().error, false);
      // todo - acra
    } else if(!"file.txt".equals(r.getName())) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, "wrong filename", false);
    } else if(!Arrays.toString(r.getDecryptedDataBytes()).equals(testMsg)) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, "decrypted file content mismatch", false);
    } else {
      addResultLine(actionName, r);
    }
  }

  private void decryptMsgAndRender(String actionName, byte[] data, PgpKeyInfo[] prvKeys) {
    DecryptMsgResult r = Node.decryptMsg(data, prvKeys, testData.passphrases(), null);
    if(r.getErr() != null) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, r.getErr().getMessage(), false);
      r.getErr().printStackTrace();
      // todo - acra
    } else if (r.getDecryptErr() != null) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, r.getDecryptErr().type + ":" + r.getDecryptErr().error, false);
      // todo - acra
    } else if(r.getAllBlockMetas().length != 1) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, "wrong amount of block metas: " + r.getAllBlockMetas().length, false);
    } else if(r.getAllBlockMetas()[0].length != testMsg.length()) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, "wrong meta block length: " + r.getAllBlockMetas()[0].length, false);
    } else if(!r.getAllBlockMetas()[0].type.equals(MsgBlock.TYPE_HTML)) {
      hasTestFailure = true;
      addResultLine(actionName, r.ms, "wrong meta block type: " + r.getAllBlockMetas()[0].type, false);
    } else {
      MsgBlock block = r.getNextBlock();
      if(!block.getType().equals(MsgBlock.TYPE_HTML)) {
        hasTestFailure = true;
        addResultLine(actionName, r.ms, "wrong block type: " + r.getAllBlockMetas()[0].length, false);
      } else if(!block.getContent().equals(testMsg)) {
        hasTestFailure = true;
        addResultLine(actionName, r.ms, "block content mismatch", false);
      } else if (r.getNextBlock() != null) {
        hasTestFailure = true;
        addResultLine(actionName, r.ms, "unexpected second block", false);
      } else {
        addResultLine(actionName, r);
      }
    }
  }

  public static void getVersionsAndRender(final TextView tvResult) {
    new AsyncTask<Void,Void,TestNodeResult>() {
      @Override
      protected TestNodeResult doInBackground(Void... params) {
        return Node.testRequest("version");
      }
      @Override
      protected void onPostExecute(TestNodeResult nodeResult) {
        String text;
        if(nodeResult.getErr() != null) {
          text = nodeResult.getErr().getMessage();
          nodeResult.getErr().printStackTrace();
        } else {
          text = nodeResult.getRawJsonResponse();
        }
        text += "\n\n" + nodeResult.ms + "ms";
        tvResult.setText(text);
      }
    }.execute();
  }

  public void runAllTestsAndRender() {
    resultText = "";
    final long startTime = System.currentTimeMillis();
    Thread t = new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          hasTestFailure = false;
          String encryptedMsg = encryptMsgAndRender("encrypt-msg", testMsg.getBytes());
          decryptMsgAndRender("decrypt-msg-ecc", encryptedMsg.getBytes(), testData.eccPrvKeyInfo());
          decryptMsgAndRender("decrypt-msg-rsa2048", encryptedMsg.getBytes(), testData.rsa2048PrvKeyInfo());
          decryptMsgAndRender("decrypt-msg-rsa4096", encryptedMsg.getBytes(), testData.rsa4096PrvKeyInfo());
          byte[] encryptedFileBytes = encryptFileAndRender("encrypt-file-10k", testData.payload(0));
          decryptFileAndRender("decrypt-file-10k-ecc", encryptedFileBytes, testData.eccPrvKeyInfo());
          decryptFileAndRender("decrypt-file-10k-rsa2048", encryptedFileBytes, testData.rsa2048PrvKeyInfo());
          decryptFileAndRender("decrypt-file-10k-rsa4096", encryptedFileBytes, testData.rsa4096PrvKeyInfo());
          for(int mb: new int[]{1, 3, 5}) {
            byte[] bytes = encryptFileAndRender("encrypt-file-" + mb + "m" + "-rsa2048", testData.payload(mb));
            decryptFileAndRender("decrypt-file-" + mb + "m" + "-rsa2048", bytes, testData.rsa2048PrvKeyInfo());
          }
          if(!hasTestFailure) {
            addResultLine("all-tests", System.currentTimeMillis() - startTime, "success", true);
          } else {
            addResultLine("all-tests", System.currentTimeMillis() - startTime, "hasTestFailure", true);
          }
        } catch (Exception e) {
          addResultLine("all-tests", System.currentTimeMillis() - startTime, e.getMessage(), true);
          // todo acra
        }
      }
    });
    t.setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
      public void uncaughtException(Thread th, Throwable e) {
        addResultLine("all-tests", System.currentTimeMillis() - startTime, e.getMessage(), true);
        // todo - acra
      }
    });
    t.start();
  }

  /**
   * this is just an example. Production app should use encrypted store
   */
  public void nodeSecretCertsCacheSave(NodeSecretCerts nodeSecretCerts) {
    try {
      FileOutputStream fos = getApplicationContext().openFileOutput(nodeSecretsCacheFilename, Context.MODE_PRIVATE);
      ObjectOutputStream oos = new ObjectOutputStream(fos);
      oos.writeObject(nodeSecretCerts);
      oos.close();
      fos.close();
    } catch(Exception e) {
      throw new RuntimeException("Could not save certs cache", e);
    }
  }

  /**
   * this is just an example. Production app should use encrypted store
   */
  public NodeSecretCerts nodeSecretCertsCacheLoad() {
    try {
      FileInputStream fis = getApplicationContext().openFileInput(nodeSecretsCacheFilename);
      ObjectInputStream ois = new ObjectInputStream(fis);
      return (NodeSecretCerts) ois.readObject();
    } catch (FileNotFoundException e) {
      return null;
    } catch (Exception e) {
      throw new RuntimeException("Could not load certs cache", e);
    }
  }

}
